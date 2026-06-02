/** Monochrome 1-bit-LCD palette matching the original Palm build: white field, black ink,
 * two grays for the dithered brick walls. */
export const PALETTE = {
  bg: '#e9e9e1', // near-white screen background
  light: '#b7b7af', // light grid lines on walls
  mid: '#6f6f68', // gray diamonds / shading
  ink: '#161613', // near-black walls / outlines / text
} as const;

// Semantic aliases
export const COLORS = {
  background: PALETTE.bg,
  wall: PALETTE.ink,
  wallShade: PALETTE.mid,
  balloon: PALETTE.ink,
  text: PALETTE.ink,
  textDim: PALETTE.mid,
  hazard: PALETTE.ink,
  flag: PALETTE.mid,
  goal: PALETTE.ink,
} as const;

/** Translucent overlays (neutral grays, no colour cast). */
export const OVERLAY = {
  panel: 'rgba(22,22,19,0.86)',
  scrim: 'rgba(22,22,19,0.55)',
  scrimLight: 'rgba(233,233,225,0.6)',
  faint: 'rgba(22,22,19,0.14)',
  btn: 'rgba(22,22,19,0.18)',
  btnHeld: 'rgba(22,22,19,0.42)',
} as const;
