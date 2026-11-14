/* Investment tracks (editable defaults) and suggested emoji. */
export const TRACKS = [
  { id: "sp500",        labelHe: "S&P 500",                 defaultReturnPct: 10 },
  { id: "equity",       labelHe: "מסלול מנייתי",            defaultReturnPct: 9 },
  { id: "age50",        labelHe: "מסלול רגיל לבני 50 ומטה", defaultReturnPct: 6.5 },
  { id: "money_market", labelHe: "קרן כספית",               defaultReturnPct: 3.25 },
  { id: "deposit",      labelHe: "פיקדון בנקאי",            defaultReturnPct: 3.25 },
  { id: "custom",       labelHe: "השקעה עצמאית",            defaultReturnPct: null }
];
export const EMOJI_SUGGESTED = ["✈️", "🚗", "🎁", "🏠", "💍", "🎓", "💻", "🎉"];
export function trackById(id) { return TRACKS.find(function (t) { return t.id === id; }) || TRACKS[TRACKS.length - 1]; }
