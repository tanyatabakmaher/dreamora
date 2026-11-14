import { esc } from "../lib/dom.js";
import { S } from "../strings.js";
/* Semicircle gauge, modern and tapered: the band is thin at the start (0%) and grows steadily thicker toward the end (100%), with rounded ends.
   The neutral track is the whole band; progress is drawn over it in mint (a soft gradient from strong mint to light mint). The four milestone parts (25 / 50 / 75 / 100)
   are separated only by a hairline in the card color, no gaps. RTL: 0% on the right, 100% on the left, drawn over the top. No knob, no ticks, no traffic light.
   Centered: the percentage, then the accumulated amount, then "of target". Pure: Gauge({ pct, accumulated, target, id, bare }) returns an SVG string. */
var CX = 100, CY = 100, R = 78;
var W_START = 3.5, W_END = 11; /* band thickness at 0% and at 100% */
var MILESTONES = [25, 50, 75];

export function pointOnArc(pct, r) {
  var a = Math.PI * pct / 100;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}
export function thickness(pct) { return W_START + (W_END - W_START) * Math.max(0, Math.min(100, pct)) / 100; }
function pt(p) { return p[0].toFixed(2) + " " + p[1].toFixed(2); }
/* Closed outline of the band between two percentages (outer edge forward, inner edge back). */
export function bandPath(from, to) {
  var steps = Math.max(2, Math.ceil((to - from) / 2)), i, out = [], inn = [];
  for (i = 0; i <= steps; i++) {
    var p = from + (to - from) * i / steps, w = thickness(p) / 2;
    out.push(pointOnArc(p, R + w)); inn.push(pointOnArc(p, R - w));
  }
  return "M" + out.map(pt).join(" L") + " L" + inn.reverse().map(pt).join(" L") + " Z";
}
function cap(p, cls, extra) {
  var c = pointOnArc(p, R);
  return '<circle class="' + cls + '" cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" r="' + (thickness(p) / 2).toFixed(2) + '"' + (extra || "") + "/>";
}
function num(n) { return Math.round(n).toLocaleString("he-IL"); }

export function Gauge(o) {
  var pct = Math.max(0, Math.min(100, o.pct)), gid = "gg-" + o.id, fillRef = ' fill="url(#' + gid + ')"';
  var svg0 = '<svg viewBox="0 0 200 122" role="img" aria-label="';
  var label = o.bare ? S["a11y.progress"].replace("{pct}", String(Math.round(pct))) :
    S["card.gaugeAria"].replace("{pct}", String(Math.round(pct))).replace("{amount}", num(o.accumulated)).replace("{target}", num(o.target));
  var svg = svg0 + esc(label) + '"><defs>' +
    '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + (CX + R) + '" y1="0" x2="' + (CX - R) + '" y2="0">' +
    '<stop offset="0" style="stop-color:var(--accent-mint-strong)"/><stop offset="1" style="stop-color:var(--accent-mint)"/></linearGradient></defs>' +
    '<path class="g-track" d="' + bandPath(0, 100) + '"/>' + cap(0, "g-track") + cap(100, "g-track");
  if (pct > 0) svg += '<path class="g-fill" d="' + bandPath(0, pct) + '"' + fillRef + "/>" + cap(0, "g-fill", fillRef) + cap(pct, "g-fill", fillRef);
  MILESTONES.forEach(function (m) {
    var a = pointOnArc(m, R - thickness(m) / 2 - 1), b = pointOnArc(m, R + thickness(m) / 2 + 1);
    svg += '<line class="g-sep" x1="' + a[0].toFixed(2) + '" y1="' + a[1].toFixed(2) + '" x2="' + b[0].toFixed(2) + '" y2="' + b[1].toFixed(2) + '"/>';
  });
  if (!o.bare) {
    svg += '<text class="g-pct" x="100" y="62" text-anchor="middle" dominant-baseline="central">' + Math.round(pct) + "%</text>" +
      '<text class="g-amount" x="100" y="92" text-anchor="middle">' + "₪" + num(o.accumulated) + "</text>" +
      '<text class="g-sub" x="100" y="109" text-anchor="middle">' + S["card.of"].replace("{target}", num(o.target)) + "</text>";
  }
  return svg + "</svg>";
}
