import Papa from "papaparse";
import { parseLinksCell, resolveShortTitle, normaliseTitleKey } from "./parse-links.js";

/**
 * @typedef {Object} ProjectNode
 * @property {string} id Short title (canonical node id)
 * @property {string} title
 * @property {string} shortTitle
 * @property {string} status
 * @property {boolean} public
 * @property {number|null} durationMonths
 * @property {string} collaborators
 * @property {string} language
 * @property {string} category
 * @property {string[]} tags
 * @property {string} description
 * @property {string} url
 * @property {string|null} imagePath assets-relative filename
 * @property {string|null} startDate ISO date if column present
 * @property {string|null} parentId parent short title from child()
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {'dependency'|'reliant'|'thematic'} type
 * @property {boolean} undirected
 */

function parseBool(value) {
  const v = String(value || "").trim().toUpperCase();
  return v === "TRUE" || v === "YES" || v === "1";
}

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseDuration(raw) {
  const n = Number(String(raw || "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {string} csvText
 * @returns {{ nodes: ProjectNode[], edges: GraphEdge[], warnings: string[] }}
 */
export function buildGraphFromCsv(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const warnings = [...(parsed.errors || []).map((e) => e.message)];

  const rows = parsed.data.filter((row) => String(row["Short title"] || "").trim());

  const shortTitleByKey = new Map();
  for (const row of rows) {
    const shortTitle = String(row["Short title"]).trim();
    const key = normaliseTitleKey(shortTitle);
    if (shortTitleByKey.has(key)) {
      warnings.push(`Duplicate short title: ${shortTitle}`);
    } else {
      shortTitleByKey.set(key, shortTitle);
    }
  }

  const nodes = rows.map((row) => {
    const shortTitle = String(row["Short title"]).trim();
    const imageRaw = String(row["Image path"] || "").trim();
    const startRaw = String(row["Start date"] || row["Start Date"] || "").trim();

    return {
      id: shortTitle,
      title: String(row.Title || shortTitle).trim(),
      shortTitle,
      status: String(row.Status || "Unknown").trim(),
      public: parseBool(row.Public),
      durationMonths: parseDuration(row.Duration),
      collaborators: String(row.Collaborators || "").trim(),
      language: String(row.Language || "").trim(),
      category: String(row.Category || "").trim(),
      tags: parseTags(row.Tags),
      description: String(row.Description || "").trim(),
      url: String(row.URL || "").trim(),
      imagePath: imageRaw || null,
      startDate: startRaw || null,
      parentId: null,
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];
  const edgeKeys = new Set();

  for (const row of rows) {
    const sourceId = String(row["Short title"]).trim();
    const { edges: parsedEdges, parents, errors } = parseLinksCell(row.Links);
    warnings.push(...errors);

    for (const p of parents) {
      const { id: parentId, error } = resolveShortTitle(p.parentShortTitle, shortTitleByKey);
      if (error) warnings.push(error);
      else if (parentId) {
        const node = nodeById.get(sourceId);
        if (node) node.parentId = parentId;
      }
    }

    for (const edge of parsedEdges) {
      const src = resolveShortTitle(edge.source, shortTitleByKey);
      const tgt = resolveShortTitle(edge.target, shortTitleByKey);
      if (src.error) warnings.push(src.error);
      if (tgt.error) warnings.push(tgt.error);
      if (!src.id || !tgt.id) continue;

      const from = src.id;
      const to = tgt.id;

      const key = `${edge.type}|${from}|${to}|${edge.undirected ? "u" : "d"}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);

      edges.push({
        id: key,
        source: from,
        target: to,
        type: edge.type,
        undirected: Boolean(edge.undirected),
      });
    }
  }

  return { nodes, edges, warnings };
}

export async function loadGraph() {
  const response = await fetch("/data/raw.csv");
  if (!response.ok) throw new Error(`Failed to load CSV (${response.status})`);
  const text = await response.text();
  return buildGraphFromCsv(text);
}
