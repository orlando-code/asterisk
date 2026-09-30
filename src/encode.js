import { palette, statusColors } from "./theme.js";
import { categoryColor, collectCategories } from "./categories.js";

const durationBins = [
  { label: "No duration", test: (n) => n == null, color: "#b8c4cc" },
  { label: "1–6 mo", test: (n) => n != null && n <= 6, color: palette.blush },
  { label: "7–24 mo", test: (n) => n != null && n <= 24, color: palette.tangerine },
  { label: "25+ mo", test: (n) => n != null && n > 24, color: palette.coral },
];

/**
 * @param {import('./load-data.js').ProjectNode} node
 * @param {string} mode
 */
export function nodeColor(node, mode) {
  switch (mode) {
    case "status":
      return statusColors[node.status] || palette.muted;
    case "category":
      return categoryColor(node.category);
    case "public":
      return node.public ? palette.fern : palette.muted;
    case "language": {
      const lang = (node.languages && node.languages[0]) || (node.language || "").split(",")[0]?.trim();
      if (!lang) return "#c5cdd3";
      if (lang === "TBC") return "#8b949e";
      return stringHueColor(lang);
    }
    case "duration": {
      const bin = durationBins.find((b) => b.test(node.durationMonths));
      return bin ? bin.color : "#b8c4cc";
    }
    default:
      return palette.sea;
  }
}

function stringHueColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 45% 48%)`;
}

/**
 * @param {string} mode
 * @returns {{ label: string, color: string }[]}
 */
export function legendEntries(mode, nodes) {
  switch (mode) {
    case "status": {
      const statuses = [...new Set(nodes.map((n) => n.status))].sort();
      return statuses.map((s) => ({ label: s, color: statusColors[s] || palette.muted }));
    }
    case "category":
      return collectCategories(nodes).map((c) => ({
        label: c,
        color: categoryColor(c),
      }));
    case "public":
      return [
        { label: "Public", color: palette.fern },
        { label: "Not public", color: palette.muted },
      ];
    case "duration":
      return durationBins.map((b) => ({ label: b.label, color: b.color }));
    case "language": {
      const langs = new Set();
      for (const n of nodes) {
        for (const part of n.languages || []) {
          if (part) langs.add(part);
        }
      }
      return [...langs].sort().map((l) => ({
        label: l,
        color: l === "TBC" ? "#8b949e" : stringHueColor(l),
      }));
    }
    default:
      return [];
  }
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
