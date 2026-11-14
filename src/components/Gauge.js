import { esc } from "../lib/dom.js";
/* Semicircle progress dial (RTL: 0% on the right, 100% on the left). pct is 0..100. */
var CX = 60, CY = 62, R = 50;
function pt(pct, r) { var a = (pct / 100) * Math.PI; return [CX + r * Math.cos(a), CY - r * Math.sin(a)]; }
export function Gauge(pct, label) {
  var ticks = "";
  for (var i = 0; i <= 10; i++) {
    var major = i % 5 === 0, p = i * 10, a = pt(p, major ? 57 : 58), b = pt(p, 64);
    ticks += '<line class="g-tick' + (major ? " major" : "") + '" x1="' + a[0].toFixed(2) + '" y1="' + a[1].toFixed(2) + '" x2="' + b[0].toFixed(2) + '" y2="' + b[1].toFixed(2) + '"/>';
  }
  var arc = "M" + (CX + R) + " " + CY + " A" + R + " " + R + " 0 0 0 " + (CX - R) + " " + CY;
  var e = pt(pct, R);
  return '<svg viewBox="-4 -4 128 78" role="img" aria-label="' + esc(label) + '">' + ticks +
    '<path class="g-track" d="' + arc + '"/>' +
    '<path class="g-fill" d="' + arc + '" pathLength="100" stroke-dasharray="' + pct.toFixed(2) + ' 100"' + (pct <= 0 ? ' style="opacity:0"' : "") + '/>' +
    '<circle class="g-dot-ring" cx="' + e[0].toFixed(2) + '" cy="' + e[1].toFixed(2) + '" r="7"/>' +
    '<circle class="g-dot" cx="' + e[0].toFixed(2) + '" cy="' + e[1].toFixed(2) + '" r="4.2"/></svg>';
}
