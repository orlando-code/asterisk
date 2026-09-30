/**
 * Curated default positions for network view (tier = row, slot = 0–1 horizontal).
 * Matches thematic grouping: hub on top, deps below, distribution strip at bottom-right.
 */
export const NETWORK_SEEDS = {
  "Earth Compress": { tier: 0, slot: 0.5 },
  ORBIS: { tier: 1, slot: 0.18 },
  "Clouds↑↓": { tier: 1, slot: 0.5 },
  IRIS: { tier: 1, slot: 0.82 },
  "Clouds Decoded": { tier: 2, slot: 0.22 },
  CoZIP: { tier: 2, slot: 0.5 },
  GeoZL: { tier: 2, slot: 0.78 },
  RainCheck: { tier: 3, slot: 0.12 },
  ThunderTrace: { tier: 3, slot: 0.26 },
  "CoZIP Reader": { tier: 3, slot: 0.5 },
  RUMI: { tier: 3, slot: 0.72 },
  Karu: { tier: 3, slot: 0.86 },
  "Major TOM": { tier: 4, slot: 0.07 },
  BetaEarth: { tier: 4, slot: 0.17 },
  TACO: { tier: 4, slot: 0.27 },
  "EC-Benchmark": { tier: 4, slot: 0.37 },
  Glue: { tier: 4, slot: 0.47 },
  Website: { tier: 4, slot: 0.62 },
  asteRisk: { tier: 4, slot: 0.72 },
  AsteriskRegistry: { tier: 4, slot: 0.82 },
  "Community Extensions": { tier: 4, slot: 0.92 },
};

const MAX_TIER = 4;

/**
 * @param {import('./load-data.js').ProjectNode[]} nodes
 * @param {number} w
 * @param {number} h
 */
export function applyNetworkSeedLayout(nodes, w, h) {
  const padX = w * 0.07;
  const padTop = h * 0.08;
  const padBottom = h * 0.12;
  const usableW = w - padX * 2;
  const rowH = (h - padTop - padBottom) / MAX_TIER;

  let fallbackIndex = 0;
  for (const n of nodes) {
    if (n._userPinned) continue;
    const seed = NETWORK_SEEDS[n.shortTitle] || NETWORK_SEEDS[n.id];
    let tier = MAX_TIER;
    let slot = 0.5;
    if (seed) {
      tier = seed.tier;
      slot = seed.slot;
    } else {
      slot = 0.15 + (fallbackIndex % 5) * 0.18;
      fallbackIndex += 1;
    }
    n.x = padX + slot * usableW;
    n.y = padTop + tier * rowH;
    n.fx = n.x;
    n.fy = n.y;
  }
}
