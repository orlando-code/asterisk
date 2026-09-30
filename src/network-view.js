/**
 * D3 force-directed project network (interaction patterns aligned with ICRS network.js).
 */

import * as d3 from "d3";
import { nodeColor, legendEntries } from "./encode.js";
import { palette } from "./theme.js";
import {
  parseStartDate,
  formatTimelineLabel,
  monthBucketKey,
  createTimelineXScale,
} from "./dates.js";
import { nodeMatchesLanguageFilter } from "./languages.js";
import { applyNetworkSeedLayout } from "./network-layout.js";
import {
  CATEGORY_PROJECT,
  CATEGORY_INTERNAL,
  CATEGORY_DISTRIBUTION,
} from "./categories.js";

const DIM_OPACITY = 0.14;
const NEIGHBOUR_OPACITY = 0.78;
const VIEW_PAD = 48;

const EDGE_STYLE = {
  dependency: { dash: "6 4", markerEnd: "arrow-dep", markerStart: null },
  reliant: { dash: null, markerEnd: "arrow-rel", markerStart: null },
  thematic: { dash: "2 5", markerEnd: "arrow-theme", markerStart: "arrow-theme-start" },
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
  setupMarkers(defs);

  const timelineLayer = zoomLayer.append("g").attr("class", "timeline-layer");
  const linkLayer = zoomLayer.append("g").attr("class", "link-layer");
  const compoundLayer = zoomLayer.append("g").attr("class", "compound-layer");
  const nodeLayer = zoomLayer.append("g").attr("class", "node-layer");
  const labelLayer = zoomLayer.append("g").attr("class", "label-layer");

  let simulation = null;
  let selectedId = null;
  let searchQuery = "";
  let matchedIds = new Set();
  let degreesCache = new Map();

  let linkSelection;
  let nodeSelection;
  let labelSelection;

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

  function graphData() {
    return { nodes: graph.nodes, edges: graph.edges };
  }

  function degreeMap(nodes, edges) {
    const map = new Map(nodes.map((n) => [n.id, 0]));
    for (const e of edges) {
      const s = e.source.id || e.source;
      const t = e.target.id || e.target;
      map.set(s, (map.get(s) || 0) + 1);
      map.set(t, (map.get(t) || 0) + 1);
    }
    return map;
  }

  function neighbourIds(nodeId, edges) {
    const set = new Set();
    if (!nodeId) return set;
    set.add(nodeId);
    for (const e of edges) {
      const s = e.source.id || e.source;
      const t = e.target.id || e.target;
      if (s === nodeId) set.add(t);
      if (t === nodeId) set.add(s);
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
    const bias = 0.35;  // 0 no pan, 1 full centre
    const tx = t.x + (width() / 2 - node.x * k - t.x) * bias;
    const ty = t.y + (height() / 2 - node.y * k - t.y) * bias;
    svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }

  function categoryHidden(node) {
    const { showProject, showInternal, showDistribution } = getState();
    if (node.category === CATEGORY_PROJECT && !showProject) return true;
    if (node.category === CATEGORY_INTERNAL && !showInternal) return true;
    if (node.category === CATEGORY_DISTRIBUTION && !showDistribution) return true;
    return false;
  }

  function languageHidden(node) {
    const { selectedLanguages, languageCount } = getState();
    if (!selectedLanguages || !languageCount) return false;
    return !nodeMatchesLanguageFilter(node, selectedLanguages, languageCount);
  }

  function nodeDimmed(node) {
    return categoryHidden(node) || languageHidden(node);
  }

  function linkDimmed(link) {
    const sId = link.source.id || link.source;
    const tId = link.target.id || link.target;
    const s = graph.nodes.find((n) => n.id === sId);
    const t = graph.nodes.find((n) => n.id === tId);
    return (s && nodeDimmed(s)) || (t && nodeDimmed(t));
  }

  function linkTier(link, neighbours) {
    if (linkDimmed(link)) return "dim";
    if (!selectedId && !searchQuery) return "default";
    const s = link.source.id || link.source;
    const t = link.target.id || link.target;
    if (selectedId && (s === selectedId || t === selectedId)) return "primary";
    if (selectedId && neighbours.has(s) && neighbours.has(t)) return "secondary";
    if (searchQuery && matchedIds.size && (matchedIds.has(s) || matchedIds.has(t))) return "search";
    return "dim";
  }

  function linkOpacity(tier) {
    if (tier === "primary") return 0.65;
    if (tier === "secondary") return 0.2;
    if (tier === "search") return 0.35;
    if (tier === "default") return 0.22;
    return 0.06;
  }

  function nodeOpacity(node, neighbours) {
    if (nodeDimmed(node)) return 0.12;
    if (selectedId) {
      if (node.id === selectedId) return 1;
      return neighbours.has(node.id) ? NEIGHBOUR_OPACITY : DIM_OPACITY;
    }
    if (searchQuery && matchedIds.size) {
      return matchedIds.has(node.id) ? 0.95 : DIM_OPACITY;
    }
    return 0.9;
  }

  function radiusFor(node, degrees) {
    const deg = degrees.get(node.id) || 0;
    const base = 16;
    return base + Math.sqrt(deg) * 7;
  }

  function trimLink(x1, y1, x2, y2, r1, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    return {
      x1: x1 + ux * r1,
      y1: y1 + uy * r1,
      x2: x2 - ux * r2,
      y2: y2 - uy * r2,
    };
  }

  function resolveSimLinks(edges, nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .map((e) => {
        const sourceId = e.source?.id ?? e.source;
        const targetId = e.target?.id ?? e.target;
        const source = byId.get(sourceId);
        const target = byId.get(targetId);
        if (!source || !target) return null;
        return { ...e, source, target };
      })
      .filter(Boolean);
  }

  function updateLinkGeometry() {
    if (!linkSelection) return;
    const degrees = degreesCache;
    linkSelection.each(function (d) {
      const s = d.source;
      const t = d.target;
      if (typeof s === "string" || typeof t === "string" || s?.x == null || t?.x == null) {
        d3.select(this).attr("opacity", 0);
        return;
      }
      const r1 = radiusFor(s, degrees);
      const r2 = radiusFor(t, degrees);
      const line = trimLink(s.x, s.y, t.x, t.y, r1 + 2, r2 + 2);
      d3.select(this)
        .attr("opacity", 1)
        .attr("x1", line.x1)
        .attr("y1", line.y1)
        .attr("x2", line.x2)
        .attr("y2", line.y2);
    });
  }

  function clampNodeInView(node) {
    const w = width();
    const h = height();
    const r = radiusFor(node, degreesCache) + 8;
    const minX = VIEW_PAD + r;
    const maxX = w - VIEW_PAD - r;
    const minY = VIEW_PAD + r;
    const maxY = h - VIEW_PAD - r;
    node.x = Math.max(minX, Math.min(maxX, node.x));
    node.y = Math.max(minY, Math.min(maxY, node.y));
    if (node.fx != null) node.fx = Math.max(minX, Math.min(maxX, node.fx));
    if (node.fy != null) node.fy = Math.max(minY, Math.min(maxY, node.fy));
  }

  /** Minimum centre distance so two circular nodes overlap by at most 0% (of the smaller). */
  function minCenterDistance(r1, r2) {
    return 2 * (r1 + r2);
  }

  /**
   * @returns {{ ticks: { label: string, x: number }[], axisEndX: number }}
   */
  function layoutTimelineNodes(dated, xScale, yMid, degrees, rangeLeft, rangeRight) {
    const buckets = new Map();
    for (const n of dated) {
      const key = monthBucketKey(n.startDate) || n.id;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(n);
    }

    const maxR =
      dated.reduce((m, n) => Math.max(m, radiusFor(n, degrees)), 16) + 14;
    const labelMinGap = Math.max(48, maxR * 0.38);

    const bucketMeta = [];
    for (const [key, group] of buckets) {
      const refDate = parseStartDate(group[0].startDate);
      if (!refDate) continue;
      bucketMeta.push({
        key,
        group,
        naturalX: xScale(refDate.getTime()),
        label: formatTimelineLabel(refDate),
      });
    }
    bucketMeta.sort((a, b) => a.naturalX - b.naturalX);

    const ticks = [];
    let prevX = rangeLeft;
    for (let i = 0; i < bucketMeta.length; i += 1) {
      const meta = bucketMeta[i];
      const x =
        i === 0
          ? Math.max(meta.naturalX, rangeLeft)
          : Math.max(meta.naturalX, prevX + labelMinGap);
      prevX = x;
      ticks.push({ label: meta.label, x });
      meta.x = x;

      meta.group.sort((a, b) => a.shortTitle.localeCompare(b.shortTitle));
      const radii = meta.group.map((n) => radiusFor(n, degrees));
      let totalGap = 0;
      for (let j = 0; j < radii.length - 1; j += 1) {
        totalGap += minCenterDistance(radii[j], radii[j + 1]);
      }
      let cy = yMid - totalGap / 2;
      meta.group.forEach((n, j) => {
        if (n._userPinned) return;
        n.fx = x;
        n.fy = cy;
        if (j < meta.group.length - 1) {
          cy += minCenterDistance(radii[j], radii[j + 1]);
        }
      });
    }

    const axisEndX = ticks.length ? ticks[ticks.length - 1].x : rangeRight;

    resolveTimelineCollisions(dated, degrees, yMid);

    return { ticks, axisEndX };
  }

  function resolveTimelineCollisions(nodes, degrees, yMid) {
    const maxR = nodes.reduce((m, n) => Math.max(m, radiusFor(n, degrees)), 16);
    const yMin = VIEW_PAD + maxR;
    const yMax = height() * 0.72 - maxR;

    for (let pass = 0; pass < 48; pass += 1) {
      let moved = false;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          if (a.fx == null || b.fx == null) continue;
          const r1 = radiusFor(a, degrees);
          const r2 = radiusFor(b, degrees);
          const need = minCenterDistance(r1, r2);
          const dx = b.fx - a.fx;
          const dy = (b.fy ?? yMid) - (a.fy ?? yMid);
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist >= need) continue;
          const push = (need - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          if (!a._userPinned) {
            a.fx -= ux * push;
            a.fy -= uy * push;
            a.fy = Math.max(yMin, Math.min(yMax, a.fy));
          }
          if (!b._userPinned) {
            b.fx += ux * push;
            b.fy += uy * push;
            b.fy = Math.max(yMin, Math.min(yMax, b.fy));
          }
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function layoutUndatedColumn(undated, x, anchorY, degrees) {
    if (!undated.length) return;
    undated.sort((a, b) => a.shortTitle.localeCompare(b.shortTitle));
    const radii = undated.map((n) => radiusFor(n, degrees));
    let totalGap = 0;
    for (let j = 0; j < radii.length - 1; j += 1) {
      totalGap += minCenterDistance(radii[j], radii[j + 1]);
    }
    let cy = anchorY - totalGap / 2;
    undated.forEach((n, j) => {
      if (n._userPinned) return;
      n.fx = x;
      n.fy = cy;
      if (j < undated.length - 1) {
        cy += minCenterDistance(radii[j], radii[j + 1]);
      }
    });
  }

  const TIMELINE_ARROW_PAD = 24;
  const UNDATED_SEPARATION = 56;

  function renderTimelineAxis(ticks, axisY, axisEndX, rangeLeft, undatedX, hasUndated) {
    timelineLayer.selectAll("*").remove();

    if (ticks.length) {
      const x0 = Math.min(rangeLeft, ticks[0].x);
      const x1 = axisEndX;

      timelineLayer
        .append("line")
        .attr("class", "timeline-axis")
        .attr("x1", x0)
        .attr("y1", axisY)
        .attr("x2", x1 + TIMELINE_ARROW_PAD)
        .attr("y2", axisY);

      timelineLayer
        .append("path")
        .attr("class", "timeline-arrow")
        .attr("d", `M${x1 + TIMELINE_ARROW_PAD},${axisY} l-10,-5 l0,10 z`);

      for (const { label, x } of ticks) {
        timelineLayer
          .append("line")
          .attr("class", "timeline-tick")
          .attr("x1", x)
          .attr("y1", axisY - 4)
          .attr("x2", x)
          .attr("y2", axisY + 4);
        timelineLayer
          .append("text")
          .attr("class", "timeline-label")
          .attr("x", x)
          .attr("y", axisY + 16)
          .attr("text-anchor", "middle")
          .text(label);
      }
    }

    if (hasUndated && undatedX != null) {
      const sepX = undatedX - UNDATED_SEPARATION * 0.55;
      timelineLayer
        .append("line")
        .attr("class", "timeline-undated-sep")
        .attr("x1", sepX)
        .attr("y1", axisY - 14)
        .attr("x2", sepX)
        .attr("y2", axisY + 2);
      timelineLayer
        .append("text")
        .attr("class", "timeline-undated-label")
        .attr("x", undatedX)
        .attr("y", axisY + 16)
        .attr("text-anchor", "middle")
        .text("No date");
    }
  }

  function applyLayout(layoutMode, nodes, edges, degrees) {
    const w = width();
    const h = height();
    const cx = w / 2;
    const cy = h / 2;
    const tagList = [...new Set(nodes.flatMap((n) => n.tags))];
    const tagIndex = new Map(tagList.map((t, i) => [t, i]));

    timelineLayer.selectAll("*").remove();

    for (const n of nodes) {
      if (!n._userPinned) {
        n.fx = null;
        n.fy = null;
      }
    }

    if (layoutMode === "timeline") {
      const dated = nodes.filter((n) => parseStartDate(n.startDate));
      const undated = nodes.filter((n) => !parseStartDate(n.startDate));
      dated.sort((a, b) => parseStartDate(a.startDate) - parseStartDate(b.startDate));

      const times = dated.map((n) => parseStartDate(n.startDate));
      const left = w * 0.06;
      const datedRight = w * 0.7;
      const yMid = h * 0.38;
      const axisY = h * 0.78;

      let axisEndX = datedRight;
      if (times.length) {
        const minT = times[0];
        const maxT = times[times.length - 1];
        const xScale = createTimelineXScale(minT, maxT, [left, datedRight]);
        const layout = layoutTimelineNodes(dated, xScale, yMid, degrees, left, datedRight);
        axisEndX = layout.axisEndX;
        const undatedX = axisEndX + TIMELINE_ARROW_PAD + UNDATED_SEPARATION;
        const undatedPinned = undated.filter((n) => !n._userPinned);
        layoutUndatedColumn(undatedPinned, undatedX, h * 0.12, degrees);
        renderTimelineAxis(
          layout.ticks,
          axisY,
          axisEndX,
          left,
          undatedX,
          undatedPinned.length > 0
        );
      } else if (undated.length) {
        const undatedX = w * 0.82;
        layoutUndatedColumn(undated.filter((n) => !n._userPinned), undatedX, h * 0.12, degrees);
        renderTimelineAxis([], axisY, left, left, undatedX, true);
      }
    } else if (layoutMode === "theme") {
      for (const n of nodes) {
        if (n._userPinned) continue;
        n.fx = null;
        n.fy = null;
      }
    } else if (layoutMode === "network") {
      applyNetworkSeedLayout(nodes, w, h);
    }

    const simLinks = resolveSimLinks(edges, nodes);

    if (simulation) simulation.stop();

    if (layoutMode === "timeline") {
      simulation = d3
        .forceSimulation(nodes)
        .force("link", null)
        .force("charge", null)
        .force("center", null)
        .force("collide", null)
        .alpha(0)
        .stop();
      nodes.forEach((n) => {
        if (n.fx != null) n.x = n.fx;
        if (n.fy != null) n.y = n.fy;
      });
      return { simulation, simLinks };
    }

    if (layoutMode === "network") {
      simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(simLinks)
            .id((d) => d.id)
            .distance((l) => (l.type === "thematic" ? 55 : 65))
            .strength(0.12)
        )
        .force("charge", d3.forceManyBody().strength(-35))
        .force(
          "x",
          d3
            .forceX((d) => d.fx ?? d.x ?? cx)
            .strength((d) => (d.fx != null ? 0.85 : 0.02))
        )
        .force(
          "y",
          d3
            .forceY((d) => d.fy ?? d.y ?? cy)
            .strength((d) => (d.fy != null ? 0.85 : 0.02))
        )
        .force("collide", d3.forceCollide().radius((d) => radiusFor(d, degrees) + 6))
        .alpha(0.55)
        .alphaDecay(0.08);

      simulation.on("end", () => {
        for (const n of nodes) {
          if (!n._userPinned && n.fx != null) {
            n.fx = n.x;
            n.fy = n.y;
          }
        }
        simulation.stop();
      });

      return { simulation, simLinks };
    }

    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.type === "thematic" ? 50 : 60))
          .strength(0.2)
      )
      .force("charge", d3.forceManyBody().strength(-90))
      .force("center", d3.forceCenter(cx, cy).strength(0.06))
      .force("collide", d3.forceCollide().radius((d) => radiusFor(d, degrees) + 10));

    if (layoutMode === "theme" && tagList.length) {
      simulation.force(
        "tagX",
        d3
          .forceX((d) => {
            const t = d.tags[0];
            if (!t) return cx;
            const ix = tagIndex.get(t) ?? 0;
            return w * 0.15 + (ix / Math.max(1, tagList.length - 1)) * w * 0.7;
          })
          .strength(0.08)
      );
      simulation.force(
        "tagY",
        d3
          .forceY((d) => {
            const extra = d.tags.length > 1 ? (d.tags.length - 1) * 18 : 0;
            return cy + extra;
          })
          .strength(0.06)
      );
    } else {
      simulation.force("tagX", null);
      simulation.force("tagY", null);
    }

    simulation.on("end", () => {
      simulation.stop();
    });

    return { simulation, simLinks };
  }

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

    const compoundSelection = compoundLayer.selectAll("g.compound").data(groups, (d) => d.parentId);
    compoundSelection.exit().remove();
    const enter = compoundSelection.enter().append("g").attr("class", "compound");
    enter.append("rect").attr("class", "compound-box");
    enter.append("text").attr("class", "compound-label");
    compoundSelection
      .merge(enter)
      .each(function (d) {
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

  function ensurePatterns(nodes) {
    for (const n of nodes) {
      if (!n.imagePath) continue;
      const pid = `pattern-${cssSafe(n.id)}`;
      if (defs.select(`#${pid}`).size()) continue;
      const pat = defs.append("pattern").attr("id", pid).attr("patternContentUnits", "objectBoundingBox");
      pat
        .append("image")
        .attr("href", `/assets/${n.imagePath}`)
        .attr("width", 1)
        .attr("height", 1)
        .attr("preserveAspectRatio", "xMidYMid slice");
    }
  }

  function cssSafe(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function updateHighlight() {
    if (!nodeSelection || !linkSelection) return;
    const { nodes, edges } = graphData();
    const neighbours = neighbourIds(selectedId, edges);
    const colorBy = getState().colorBy;

    linkSelection
      .attr("stroke-opacity", (d) => linkOpacity(linkTier(d, neighbours)))
      .attr("stroke-width", (d) => (linkTier(d, neighbours) === "primary" ? 2.2 : 1.4));

    nodeSelection
      .attr("fill", (d) => nodeColor(d, colorBy))
      .attr("stroke", (d) => (d.id === selectedId ? palette.seaDeep : "#fff"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5))
      .attr("opacity", (d) => nodeOpacity(d, neighbours));

    labelSelection.attr("opacity", (d) => nodeOpacity(d, neighbours));
    labelSelection.attr("font-size", 14)

    renderLegendPanel(nodes, colorBy);
    renderCompoundBoxes(nodes);
    updateLinkGeometry();
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
    const { nodes, edges } = graphData();
    updateSearchMatches(nodes);
    degreesCache = degreeMap(nodes, edges);
    const maxDeg = Math.max(1, ...degreesCache.values());

    ensurePatterns(nodes);

    const { simulation: sim, simLinks } = applyLayout(layoutMode, nodes, edges, degreesCache);

    linkSelection = linkLayer.selectAll("line.link").data(simLinks, (d) => d.id);
    linkSelection.exit().remove();
    const linkEnter = linkSelection.enter().append("line").attr("class", (d) => `link link-${d.type}`);
    linkSelection = linkEnter.merge(linkSelection);

    linkSelection
      .attr("stroke", palette.sea)
      .attr("stroke-dasharray", (d) => EDGE_STYLE[d.type]?.dash || null)
      .attr("marker-end", (d) => {
        const m = EDGE_STYLE[d.type]?.markerEnd;
        return m ? `url(#${m})` : null;
      })
      .attr("marker-start", (d) => {
        const m = EDGE_STYLE[d.type]?.markerStart;
        return m ? `url(#${m})` : null;
      });

    nodeSelection = nodeLayer.selectAll("g.node").data(nodes, (d) => d.id);
    nodeSelection.exit().remove();
    const nodeEnter = nodeSelection.enter().append("g").attr("class", "node");
    nodeEnter.append("circle").attr("class", "node-bg");
    nodeEnter.append("circle").attr("class", "node-fill");
    nodeEnter.append("title");
    nodeSelection = nodeEnter.merge(nodeSelection);
    attachDragBehavior(nodeSelection, layoutMode);

    nodeSelection
      .select("circle.node-bg")
      .attr("r", (d) => radiusFor(d, degreesCache) + 3)
      .attr("fill", (d) => (d.imagePath ? `url(#pattern-${cssSafe(d.id)})` : "transparent"))
      .attr("opacity", 0.35);

    nodeSelection
      .select("circle.node-fill")
      .attr("r", (d) => radiusFor(d, degreesCache))
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
      .attr("dy", (d) => radiusFor(d, degreesCache) + 16)
      .text((d) => d.shortTitle);

    sim.on("tick", () => {
      if (getState().layoutMode !== "timeline") {
        nodes.forEach(clampNodeInView);
      }
      nodeSelection.attr("transform", (d) => `translate(${d.x},${d.y})`);
      labelSelection.attr("x", (d) => d.x).attr("y", (d) => d.y);
      updateLinkGeometry();
      renderCompoundBoxes(nodes);
    });

    if (getState().layoutMode === "timeline") {
      nodeSelection.attr("transform", (d) => `translate(${d.x},${d.y})`);
      labelSelection.attr("x", (d) => d.x).attr("y", (d) => d.y);
      updateLinkGeometry();
      renderCompoundBoxes(nodes);
    }

    updateHighlight();

    const summary = document.getElementById("graph-summary");
    if (summary) {
      summary.textContent = `${nodes.length} nodes · ${edges.length} links · max degree ${maxDeg}`;
    }
  }

  function attachDragBehavior(selection, layoutMode) {
    if (layoutMode === "timeline") {
      selection.on(".drag", null).style("cursor", "pointer");
      return;
    }
    selection.style("cursor", "grab").call(bindDrag());
  }

  function bindDrag() {
    return d3
      .drag()
      .on("start", (event, d) => {
        event.sourceEvent?.stopPropagation?.();
        if (simulation) simulation.stop();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        d.x = event.x;
        d.y = event.y;
        clampNodeInView(d);
        nodeSelection?.attr("transform", (n) => `translate(${n.x},${n.y})`);
        labelSelection?.attr("x", (n) => n.x).attr("y", (n) => n.y);
        updateLinkGeometry();
        renderCompoundBoxes(graph.nodes);
      })
      .on("end", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        d._userPinned = true;
        clampNodeInView(d);
      });
  }

  function setSearch(query) {
    searchQuery = String(query || "").trim().toLowerCase();
    updateSearchMatches(graphData().nodes);
    updateHighlight();
  }

  function refreshFilters() {
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
    refreshFilters,
    resize,
  };
}

function setupMarkers(defs) {
  const arrowPath = "M0,-4L8,0L0,4";
  const specs = [
    { id: "arrow-dep", path: arrowPath },
    { id: "arrow-rel", path: arrowPath },
    { id: "arrow-theme", path: arrowPath },
    { id: "arrow-theme-start", path: "M8,-4L0,0L8,4" },
  ];
  for (const spec of specs) {
    defs
      .append("marker")
      .attr("id", spec.id)
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 7)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", spec.path)
      .attr("fill", palette.sea);
  }
}
