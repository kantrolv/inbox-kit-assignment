// Game configuration. The backend is the single source of truth and sends the
// relevant pieces to the frontend, so the client hardcodes nothing.

export const COLS = 40;
export const ROWS = 24;

// Lock power-up: a locked tile is protected for this long, and a player can
// place one lock this often. (Normal claims have no cooldown — instant.)
export const LOCK_DURATION_MS = 8000;
export const LOCK_COOLDOWN_MS = 8000;

export const MAX_NAME = 16;

export const PALETTE = [
  "#ff6b6b", "#ff924c", "#ffd166", "#c3e84a",
  "#06d6a0", "#2dd4bf", "#4cc9f0", "#4d96ff",
  "#5e7bff", "#b08bff", "#d66bff", "#ff7ac4",
  "#ff5d8f", "#f4a261", "#9b8cff", "#56cfe1",
];

export const tileId = (x, y) => `${x}:${y}`;
