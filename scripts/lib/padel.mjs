// Padel court in metres (official FIP measures) and how the SVG maps them.
// SVG box 440 × 230, playing field from (10, 10) to (430, 220): 21 px per metre.
export const M = { length: 20, width: 10, serviceFromNet: 6.95 };
export const PX = 21;
export const ORIGIN = 10;
export const toPx = (m) => ORIGIN + m * PX;
export const toM = (px) => (px - ORIGIN) / PX;
export const NET_X = toPx(M.length / 2); // 220
export const SERVICE_LEFT_X = toPx(M.length / 2 - M.serviceFromNet); // 74.05
export const SERVICE_RIGHT_X = toPx(M.length / 2 + M.serviceFromNet); // 365.95
export const CENTRE_Y = toPx(M.width / 2); // 115
export const FIELD = { x1: ORIGIN, y1: ORIGIN, x2: toPx(M.length), y2: toPx(M.width) };
