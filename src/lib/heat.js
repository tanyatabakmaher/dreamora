/* Shared by the track lists: "MM/YYYY" and the cheap-to-expensive colour scale. */
export function mmYYYY(d) { return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
/* Deposit size as colour: cheap = mint, middle = gold, expensive = coral (all from the app palette). */
var HEAT = ["#78CEB2", "#EBCB88", "#F2A08F"];
export function heat(pct) {
  var x = Math.max(0, Math.min(100, pct)) / 100 * 2, i = Math.min(1, Math.floor(x)), f = x - i;
  function ch(c, k) { return parseInt(c.slice(1 + k * 2, 3 + k * 2), 16); }
  var out = [0, 1, 2].map(function (k) { return Math.round(ch(HEAT[i], k) + (ch(HEAT[i + 1], k) - ch(HEAT[i], k)) * f); });
  return "rgb(" + out.join(",") + ")";
}
