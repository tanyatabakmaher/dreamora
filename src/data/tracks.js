/* Investment tracks (editable defaults) and suggested emoji. defaultReturnPct is the gross expected yearly return (before fees); defaultFeePct is the typical yearly management fee. */
export const TRACKS = [
  { id: "sp500",        labelHe: "S&P 500",                 defaultReturnPct: 10,   defaultFeePct: 0.6 },
  { id: "equity",       labelHe: "מסלול מנייתי",            defaultReturnPct: 9,    defaultFeePct: 0.6 },
  { id: "age50",        labelHe: "מסלול רגיל לבני 50 ומטה", defaultReturnPct: 6.5,  defaultFeePct: 0.55 },
  { id: "bonds",        labelHe: "אג\"ח (אשראי ואג\"ח)",    defaultReturnPct: 5,    defaultFeePct: 0.6 },
  { id: "money_market", labelHe: "קרן כספית",               defaultReturnPct: 3.25, defaultFeePct: 0.1 },
  { id: "deposit",      labelHe: "פיקדון בנקאי",            defaultReturnPct: 3.25, defaultFeePct: 0 },
  { id: "custom",       labelHe: "השקעה עצמאית",            defaultReturnPct: null, defaultFeePct: 0 }
];
export const EMOJI_SUGGESTED = ["✈️", "🚗", "🎁", "🏠", "💍", "🎓", "💻", "🎉"];
export function trackById(id) { return TRACKS.find(function (t) { return t.id === id; }) || TRACKS[TRACKS.length - 1]; }
