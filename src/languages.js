/** GitHub linguist-style colours (approximate). */
const LINGUIST = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  R: "#198CE7",
  Julia: "#a270ba",
  C: "#555555",
  "C++": "#f34b7d",
  Java: "#b07219",
  Rust: "#dea584",
  Go: "#00ADD8",
};

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function parseLanguageList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** @param {import('./load-data.js').ProjectNode[]} nodes */
export function collectLanguages(nodes) {
  const set = new Set();
  for (const n of nodes) {
    for (const lang of n.languages || []) set.add(lang);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function linguistColor(lang) {
  return LINGUIST[lang] || "#8b949e";
}

/**
 * @param {import('./load-data.js').ProjectNode} node
 * @param {Set<string>} selected
 * @param {number} totalLanguageCount
 */
export function nodeMatchesLanguageFilter(node, selected, totalLanguageCount) {
  if (!totalLanguageCount || selected.size === totalLanguageCount) return true;
  if (!selected.size) return false;
  const langs = node.languages || [];
  if (!langs.length) return false;
  return langs.some((l) => selected.has(l));
}
