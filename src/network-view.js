/**
 * D3 force-directed project network (interaction patterns aligned with ICRS network.js).
 */

import * as d3 from "d3";
import { nodeColor, legendEntries } from "./encode.js";
import { palette } from "./theme.js";

const DIM_OPACITY = 0.14;
const NEIGHBOUR_OPACITY = 0.78;

const EDGE_STYLE = {
  dependency: { dash: "6 4", marker: "arrow-dep" },
  reliant: { dash: null, marker: "arrow-rel" },
  thematic: { dash: "2 5", marker: "arrow-theme" },
};

/**
 * @param {HTMLElement} container
 * @param {{ nodes: import('./load-data.js').ProjectNode[], edges: import('./load-data.js').GraphEdge[] }} graph
 * @param {{ onSelect: (node: import('./load-data.js').ProjectNode | null) => void, getState: () => object }} options
 */
export function createNetworkView(container, graph, options) {
  const width = () => container.clientWidth || 800;
  const height = () => container.clientHeight || 600;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("class", "network-svg")
    .attr("width", "100%")
    .attr("height", "100%");

  const zoomLayer = svg.append("g").attr("class", "zoom-layer");
  zoomLayer
    .append("rect")
    .attr("class", "graph-backdrop")
    .attr("fill", "transparent")
    .attr("pointer-events", "all");
  const defs = svg.append("defs");

  for (const [type, style] of Object.entries(EDGE_STYLE)) {
    defs
      .append("marker")
      .attr("id", style.marker)
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 16)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", palette.sea);
  }

  const islandLayer = zoomLayer.append("g").attr("class", "island-layer");
  const linkLayer = zoomLayer.append("g").attr("class", "link-layer");
  const compoundLayer = zoomLayer.append("g").attr("class", "compound-layer");
  const nodeLayer = zoomLayer.append("g").attr("class", "node-layer");
  const labelLayer = zoomLayer.append("g").attr("class", "label-layer");

  let simulation = null;
  let selectedId = null;
  let searchQuery = "";
  let matchedIds = new Set();

  const zoom = d3
    .zoom()
    .scaleExtent([0.25, 3])
    .on("zoom", (event) => {
      zoomLayer.attr("transform", event.transform);
    });

  svg.call(zoom).on("dblclick.zoom", null);

  zoomLayer.select("rect.graph-backdrop").on("click", () => selectNode(null));

  function getState() {
    return options.getState();
  }

  function visibleNodeSet() {
    const { showProject, showInternal } = getState();
    const ids = new Set();
    for (const n of graph.nodes) {
      if (n.category === "Project" && !showProject) continue;
      if (n.category === "Internal" && !showInternal) continue;
      ids.add(n.id);
    }
    return ids;
  }

  function activeGraph() {
    const visible = visibleNodeSet();
    const nodes = graph.nodes.filter((n) => visible.has(n.id));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, edges };
  }

  function degreeMap(nodes, edges) {
    const map = new Map(nodes.map((n) => [n.id, 0]));
    for (const e of edges) {
      map.set(e.source, (map.get(e.source) || 0) + 1);
      map.set(e.target, (map.get(e.target) || 0) + 1);
    }
    return map;
  }

  function neighbourIds(nodeId, edges) {
    const set = new Set();
    if (!nodeId) return set;
    set.add(nodeId);
    for (const e of edges) {
      if (e.source === nodeId) set.add(e.target);
      if (e.target === nodeId) set.add(e.source);
    }
    return set;
  }

  function nodeVisibleBySearch(node) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const hay = [
      node.title,
      node.shortTitle,
      node.description,
      node.tags.join(" "),
      node.collaborators,
      node.language,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function updateSearchMatches(nodes) {
    matchedIds = new Set();
    if (!searchQuery) return;
    for (const n of nodes) {
      if (nodeVisibleBySearch(n)) matchedIds.add(n.id);
    }
  }

  function selectNode(id) {
    selectedId = id;
    const node = id ? graph.nodes.find((n) => n.id === id) : null;
    options.onSelect(node);
    focusOnNode(node);
    updateHighlight();
  }

  function focusOnNode(node) {
    if (!node || node.x == null) return;
    const t = d3.zoomTransform(svg.node());
    const k = t.k;
    const tx = width() / 2 - node.x * k;
    const ty = height() / 2 - node.y * k;
    svg.transition().duration(350).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(k)
    );
  }

  function linkTier(link, neighbours, categoryDimmed) {
    if (categoryDimmed) return "dim";
    if (!selectedId && !searchQuery) return "default";
    const s = typeof link.source === "object" ? link.source.id : link.source;
    const t = typeof link.target === "object" ? link.target.id : link.target;
    if (selectedId && (s === selectedId || t === selectedId)) return "primary";
    if (selectedId && neighbours.has(s) && neighbours.has(t)) return "secondary";
    if (searchQuery && matchedIds.size) {
      if (matchedIds.has(s) || matchedIds.has(t)) return "search";
    }
    return "dim";
  }

  function linkOpacity(tier) {
    if (tier === "primary") return 0.65;
    if (tier === "secondary") return 0.2;
    if (tier === "search") return 0.35;
    if (tier === "default") return 0.22;
    return 0.06;
  }

  function nodeOpacity(node, neighbours, categoryHidden) {
    if (categoryHidden) return 0.12;
    if (selectedId) {
      if (node.id === selectedId) return 1;
      return neighbours.has(node.id) ? NEIGHBOUR_OPACITY : DIM_OPACITY;
    }
    if (searchQuery && matchedIds.size) {
      return matchedIds.has(node.id) ? 0.95 : DIM_OPACITY;
    }
    return 0.9;
  }

  function categoryHidden(node) {
    const { showProject, showInternal } = getState();
    if (node.category === "Project" && !showProject) return true;
    if (node.category === "Internal" && !showInternal) return true;
    return false;
  }

  let linkSelection;
  let nodeSelection;
  let labelSelection;
  let islandSelection;
  let compoundSelection;

  function renderCompoundBoxes(nodes) {
    const childrenByParent = new Map();
    for (const n of nodes) {
      if (!n.parentId) continue;
      if (!childrenByParent.has(n.parentId)) childrenByParent.set(n.parentId, []);
      childrenByParent.get(n.parentId).push(n);
    }

    const groups = [...childrenByParent.entries()].map(([parentId, children]) => ({
      parentId,
      children,
    }));

    compoundSelection = compoundSelection?.data(groups, (d) => d.parentId) || compoundLayer.selectAll("g.compound");
    compoundSelection = compoundLayer.selectAll("g.compound").data(groups, (d) => d.parentId);
    compoundSelection.exit().remove();
    const enter = compoundSelection.enter().append("g").attr("class", "compound");
    enter.append("rect").attr("class", "compound-box");
    enter.append("text").attr("class", "compound-label");
    compoundSelection = enter.merge(compoundSelection);

    compoundSelection.each(function (d) {
      const pts = d.children.filter((c) => c.x != null);
      if (!pts.length) return;
      const pad = 28;
      const xs = pts.map((c) => c.x);
      const ys = pts.map((c) => c.y);
      const x0 = Math.min(...xs) - pad;
      const x1 = Math.max(...xs) + pad;
      const y0 = Math.min(...ys) - pad;
      const y1 = Math.max(...ys) + pad;
      d3.select(this)
        .select("rect")
        .attr("x", x0)
        .attr("y", y0)
        .attr("width", x1 - x0)
        .attr("height", y1 - y0);
      d3.select(this)
        .select("text")
        .attr("x", x0 + 8)
        .attr("y", y0 + 14)
        .text(d.parentId);
    });
  }

  function applyLayoutForces(layoutMode, nodes, edges, degrees) {
    const w = width();
    const h = height();
    const cx = w / 2;
    const cy = h / 2;
    const tagList = [...new Set(nodes.flatMap((n) => n.tags))];
    const tagIndex = new Map(tagList.map((t, i) => [t, i]));

    const isolated = nodes.filter((n) => (degrees.get(n.id) || 0) === 0);
    const connected = nodes.filter((n) => (degrees.get(n.id) || 0) > 0);

    const islandCx = w * 0.88;
    const islandCy = h * 0.82;
    const islandR = Math.min(w, h) * 0.12;

    if (layoutMode === "timeline") {
      const dated = nodes.filter((n) => n.startDate);
      const undated = nodes.filter((n) => !n.startDate);
      const parse = (d) => new Date(d.startDate);
      dated.sort((a, b) => parse(a) - parse(b));

      const left = w * 0.08;
      const right = w * 0.72;
      const yMid = h * 0.5;
      dated.forEach((n, i) => {
        const t = dated.length <= 1 ? 0.5 : i / (dated.length - 1);
        n.fx = left + t * (right - left);
        n.fy = yMid + (i % 2 === 0 ? -40 : 40);
      });
      undated.forEach((n, i) => {
        n.fx = w * 0.86;
        n.fy = h * 0.25 + i * 36;
      });
      connected.forEach((n) => {
        if ((degrees.get(n.id) || 0) > 0 && !n.startDate) {
          n.fx = null;
          n.fy = null;
        }
      });
    } else if (layoutMode === "theme") {
      nodes.forEach((n) => {
        n.fx = null;
        n.fy = null;
        if (!n.tags.length) return;
        const ix = tagList.length ? tagIndex.get(n.tags[0]) / tagList.length : 0.5;
        const angle = ix * Math.PI * 2;
        n.vx = (n.vx || 0) + Math.cos(angle) * 0.4;
        n.vy = (n.vy || 0) + Math.sin(angle) * 0.4;
      });
    } else {
      nodes.forEach((n) => {
        if ((degrees.get(n.id) || 0) > 0) {
          n.fx = null;
          n.fy = null;
        }
      });
    }

    const simNodes = nodes;
    const simLinks = edges.map((e) => ({ ...e }));

    if (simulation) simulation.stop();

    simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.type === "thematic" ? 90 : 110))
          .strength(0.1)
      )
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(cx, cy))
      .force("collide", d3.forceCollide().radius((d) => radiusFor(d, degrees) + 12));

    if (layoutMode === "theme" && tagList.length) {
      const tagListRef = tagList;
      simulation.force(
        "tagX",
        d3.forceX((d) => {
          const t = d.tags[0];
          if (!t) return cx;
          const ix = tagIndex.get(t) ?? 0;
          return w * 0.15 + (ix / Math.max(1, tagListRef.length - 1)) * w * 0.7;
        }).strength(0.08)
      );
      simulation.force(
        "tagY",
        d3.forceY((d) => {
          const extra = d.tags.length > 1 ? (d.tags.length - 1) * 18 : 0;
          return cy + extra;
        }).strength(0.06)
      );
    } else {
      simulation.force("tagX", null);
      simulation.force("tagY", null);
    }

    return { simulation, simLinks };
  }

  function radiusFor(node, degrees) {
    const deg = degrees.get(node.id) || 0;
    const base = 16;
    return base + Math.sqrt(deg) * 7;
  }

  function ensurePatterns(nodes) {
    for (const n of nodes) {
      if (!n.imagePath) continue;
      const pid = `pattern-${cssSafe(n.id)}`;
      if (defs.select(`#${pid}`).size()) continue;
      const pat = defs.append("pattern").attr("id", pid).attr("patternContentUnits", "objectBoundingBox");
      pat.append("image").attr("href", `/assets/${n.imagePath}`).attr("width", 1).attr("height", 1).attr("preserveAspectRatio", "xMidYMid slice");
    }
  }

  function cssSafe(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function updateHighlight() {
    if (!nodeSelection || !linkSelection) return;
    const { nodes, edges } = activeGraph();
    const allVisible = new Set(graph.nodes.map((n) => n.id));
    const neighbours = neighbourIds(selectedId, edges);
    const colorBy = getState().colorBy;

    linkSelection
      .attr("stroke-opacity", (d) => {
        const hidden =
          !allVisible.has(d.source.id || d.source) || !allVisible.has(d.target.id || d.target);
        const tier = linkTier(d, neighbours, hidden);
        return linkOpacity(tier);
      })
      .attr("stroke-width", (d) => (linkTier(d, neighbours, false) === "primary" ? 2.2 : 1.4));

    nodeSelection
      .attr("fill", (d) => nodeColor(d, colorBy))
      .attr("stroke", (d) => (d.id === selectedId ? palette.seaDeep : "#fff"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5))
      .attr("opacity", (d) => nodeOpacity(d, neighbours, categoryHidden(d)));

    labelSelection.attr("opacity", (d) => nodeOpacity(d, neighbours, categoryHidden(d)));

    renderLegendPanel(nodes, colorBy);
    renderCompoundBoxes(nodes);
  }

  function renderLegendPanel(nodes, colorBy) {
    const el = document.getElementById("legend");
    if (!el) return;
    const entries = legendEntries(colorBy, nodes);
    el.innerHTML = entries
      .map(
        (e) =>
          `<span class="legend-item"><span class="legend-swatch" style="background:${e.color}"></span>${e.label}</span>`
      )
      .join("");
  }

  function layoutBackdrop() {
    zoomLayer
      .select("rect.graph-backdrop")
      .attr("x", -width())
      .attr("y", -height())
      .attr("width", width() * 3)
      .attr("height", height() * 3);
  }

  function render() {
    layoutBackdrop();
    const { layoutMode } = getState();
    const { nodes, edges } = activeGraph();
    updateSearchMatches(nodes);
    const degrees = degreeMap(nodes, edges);
    const maxDeg = Math.max(1, ...degrees.values());

    ensurePatterns(nodes);

    const { simulation: sim, simLinks } = applyLayoutForces(layoutMode, nodes, edges, degrees);

    linkSelection = linkLayer.selectAll("line.link").data(simLinks, (d) => d.id);
    linkSelection.exit().remove();
    const linkEnter = linkSelection
      .enter()
      .append("line")
      .attr("class", (d) => `link link-${d.type}`);
    linkSelection = linkEnter.merge(linkSelection);

    linkSelection
      .attr("stroke", palette.sea)
      .attr("stroke-dasharray", (d) => EDGE_STYLE[d.type]?.dash || null)
      .attr("marker-end", (d) => (d.undirected ? null : `url(#${EDGE_STYLE[d.type].marker})`))
      .attr("marker-start", (d) =>
        d.undirected ? `url(#${EDGE_STYLE[d.type].marker})` : null
      );

    nodeSelection = nodeLayer.selectAll("g.node").data(nodes, (d) => d.id);
    nodeSelection.exit().remove();
    const nodeEnter = nodeSelection.enter().append("g").attr("class", "node").call(bindDrag(sim));
    nodeEnter.append("circle").attr("class", "node-bg");
    nodeEnter.append("circle").attr("class", "node-fill");
    nodeEnter.append("title");
    nodeSelection = nodeEnter.merge(nodeSelection);

    nodeSelection
      .select("circle.node-bg")
      .attr("r", (d) => radiusFor(d, degrees) + 3)
      .attr("fill", (d) => (d.imagePath ? `url(#pattern-${cssSafe(d.id)})` : "transparent"))
      .attr("opacity", 0.35);

    nodeSelection
      .select("circle.node-fill")
      .attr("r", (d) => radiusFor(d, degrees))
      .attr("fill", (d) => nodeColor(d, getState().colorBy))
      .attr("fill-opacity", (d) => (d.imagePath ? 0.72 : 1));

    nodeSelection.select("title").text((d) => d.title);

    nodeSelection.on("click", (event, d) => {
      event.stopPropagation();
      selectNode(d.id);
    });

    labelSelection = labelLayer.selectAll("text.node-label").data(nodes, (d) => d.id);
    labelSelection.exit().remove();
    const labelEnter = labelSelection
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none");
    labelSelection = labelEnter.merge(labelSelection);
    labelSelection
      .attr("dy", (d) => radiusFor(d, degrees) + 14)
      .text((d) => d.shortTitle);

    sim.on("tick", () => {
      linkSelection
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      nodeSelection.attr("transform", (d) => `translate(${d.x},${d.y})`);
      labelSelection.attr("x", (d) => d.x).attr("y", (d) => d.y);
      renderCompoundBoxes(nodes);
    });

    updateHighlight();

    const summary = document.getElementById("graph-summary");
    if (summary) {
      summary.textContent = `${nodes.length} nodes · ${edges.length} links · max degree ${maxDeg}`;
    }
  }

  function bindDrag(sim) {
    return d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        if (getState().layoutMode !== "timeline") {
          d.fx = null;
          d.fy = null;
        };
        simulation.stop()
      });
  }

  function setSearch(query) {
    searchQuery = String(query || "").trim().toLowerCase();
    updateSearchMatches(activeGraph().nodes);
    updateHighlight();
  }

  function resize() {
    render();
  }

  render();

  return {
    render,
    setSearch,
    selectNode,
    resize,
  };
}
