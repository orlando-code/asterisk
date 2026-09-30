import { palette } from "./theme.js";

export const CATEGORY_PROJECT = "Project";
export const CATEGORY_INTERNAL = "Internal";
export const CATEGORY_DISTRIBUTION = "Distribution and infrastructure";

const CATEGORY_COLORS = {
  [CATEGORY_PROJECT]: palette.sea,
  [CATEGORY_INTERNAL]: palette.fern,
  [CATEGORY_DISTRIBUTION]: palette.tangerine,
};

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || palette.muted;
}

/** @param {import('./load-data.js').ProjectNode[]} nodes */
export function collectCategories(nodes) {
  return [...new Set(nodes.map((n) => n.category).filter(Boolean))].sort();
}
