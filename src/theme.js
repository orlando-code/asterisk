/**
 * Palette derived from assets/asterisk_logo.png and brand accents in repo assets.
 */
export const palette = {
  ink: "#14212b",
  muted: "#5a6b78",
  paper: "#edf2f5",
  panel: "rgba(255, 255, 255, 0.94)",
  line: "rgba(20, 33, 43, 0.14)",
  sea: "#20409a",
  seaDeep: "#152a66",
  coral: "#e75d2f",
  tangerine: "#eb7d58",
  blush: "#ffaf94",
  fern: "#76ac3c",
  olive: "#91b66a",
  sky: "#50a0ff",
};

export const statusColors = {
  Active: palette.sea,
  Announced: palette.sky,
  Commencing: palette.tangerine,
  Complete: palette.fern,
  Early: palette.blush,
  Potential: palette.muted,
};
