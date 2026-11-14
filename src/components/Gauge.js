import { esc } from "../lib/dom.js";
import { S } from "../strings.js";
/* Semicircle gauge, thin and segmented: four arcs, one per 25% milestone, with small gaps. RTL: 0% on the right, 100% on the left, arc drawn over the top.
   The neutral track shows all four segments; the progress is drawn over it in mint (a soft gradient from strong mint to light mint). No knob, no ticks, no traffic light.
   Centered: the percentage, then the accumulated amount, then "of target". Pure: Gauge({ pct, accumulated, target, id, bare }) returns an SVG string. */
var CX = 100, CY = 100, R = 80;
var SEGMENTS = 4, SEG = 100 / SEGMENTS, PAD = 2.5; /* each segment is shortened by PAD percent points at both ends, which makes the gaps */

export function pointOnArc(pct, r) {
  var a = Math.PI * pct / 100;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}
function arc(from, to) {
  var a = pointOnArc(from, R), b = pointOnArc(to, R);
  return "M" + a[0].toFixed(2) + " " + a[1].toFixed(2) + " A" + R + " " + R + " 0 0 0 " + b[0].toFixed(2) + " " + b[1].toFixed(2);
}
function num(n) { return Math.round(n).toLocaleString("he-IL"); }
/* Pure helper (tested): the progress arcs as [from, to] pairs in percent points, one per segment that has any progress. */
export function fillSpans(pct) {
  var out = [];
  for (var i = 0; i < SEGMENTS; i++) {
    var f = Math.max(0, Math.min(1, (pct - i * SEG) / SEG));
    if (f <= 0) continue;
    var a = i * SEG + PAD, b = (i + 1) * SEG - PAD;
    out.push([a, a + (b - a) * f]);
  }
  return out;
}

export function Gauge(o) {
  var pct = Math.max(0, Math.min(100, o.pct)), gid = "gg-" + o.id, i;
  var track = "", fill = "";
  for (i = 0; i < SEGMENTS; i++) track += '<path class="g-track" d="' + arc(i * SEG + PAD, (i + 1) * SEG - PAD) + '"/>';
  fillSpans(pct).forEach(function (s) { fill += '<path class="g-fill" d="' + arc(s[0], s[1]) + '" stroke="url(#' + gid + ')"/>'; });
  var label = o.bare ? S["a11y.progress"].replace("{pct}", String(Math.round(pct))) :
    S["card.gaugeAria"].replace("{pct}", String(Math.round(pct))).replace("{amount}", num(o.accumulated)).replace("{target}", num(o.target));
  var svg = '<svg viewBox="0 0 200 122" role="img" aria-label="' + esc(label) + '"><defs>' +
    '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + (CX + R) + '" y1="0" x2="' + (CX - R) + '" y2="0">' +
    '<stop offset="0" style="stop-color:var(--accent-mint-strong)"/><stop offset="1" style="stop-color:var(--accent-mint)"/></linearGradient></defs>' + track + fill;
  if (!o.bare) {
    svg += '<text class="g-pct" x="100" y="62" text-anchor="middle" dominant-baseline="central">' + Math.round(pct) + "%</text>" +
      '<text class="g-amount" x="100" y="92" text-anchor="middle">' + num(o.accumulated) + "</text>" +
      '<text class="g-sub" x="100" y="109" text-anchor="middle">' + S["card.of"].replace("{target}", num(o.target)) + "</text>";
  }
  return svg + "</svg>";
}
