import { esc } from "../lib/dom.js";
import { S } from "../strings.js";
/* Semicircle dial. RTL: 0% on the right, 100% on the left, arc drawn over the top.
   One mint color along the arc (no traffic light); the track is the neutral border color.
   Pure: Gauge({ pct, accumulated, target, id }) returns an SVG string. */
var CX = 100, CY = 100, R = 80;
var ARC_STOPS = ["#78CEB2", "#78CEB2", "#78CEB2"];   /* arc and knob: one mint at every percentage (no traffic light) */
var TEXT_STOPS = ["#B7E4D2", "#B7E4D2", "#B7E4D2"];  /* lighter mint: text on the card surface */

export function pointOnArc(pct, r) {
  var a = Math.PI * pct / 100;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}
function hex(n) { return Math.round(n).toString(16).padStart(2, "0"); }
function lerp(c1, c2, f) {
  var a = [1, 3, 5].map(function (i) { return parseInt(c1.substr(i, 2), 16); });
  var b = [1, 3, 5].map(function (i) { return parseInt(c2.substr(i, 2), 16); });
  return "#" + a.map(function (v, i) { return hex(v + (b[i] - v) * f); }).join("");
}
export function colorAt(pct, stops) {
  var a = Math.PI * pct / 100, t = (1 - Math.cos(a)) / 2;
  return t < 0.5 ? lerp(stops[0], stops[1], 2 * t) : lerp(stops[1], stops[2], 2 * t - 1);
}
export function knobColor(pct) { return colorAt(pct, ARC_STOPS); }
export function textColor(pct) { return colorAt(pct, TEXT_STOPS); }

var ARC = "M" + (CX + R) + " " + CY + " A" + R + " " + R + " 0 0 0 " + (CX - R) + " " + CY;
function num(n) { return Math.round(n).toLocaleString("he-IL"); }

export function Gauge(o) {
  var pct = Math.max(0, Math.min(100, o.pct)), gid = "gg-" + o.id;
  var ticks = "";
  for (var i = 0; i <= 10; i++) ticks += tick(i * 10, i === 0 || i === 5 || i === 10);
  ticks += tick(25, true) + tick(75, true);
  function tick(p, major) {
    var a = pointOnArc(p, 93), b = pointOnArc(p, major ? 100 : 97);
    return '<line class="g-tick' + (major ? " major" : "") + '" x1="' + a[0].toFixed(2) + '" y1="' + a[1].toFixed(2) + '" x2="' + b[0].toFixed(2) + '" y2="' + b[1].toFixed(2) + '"/>';
  }
  var label = o.bare ? S["a11y.progress"].replace("{pct}", String(Math.round(pct))) :
    S["card.gaugeAria"].replace("{pct}", String(Math.round(pct))).replace("{amount}", num(o.accumulated)).replace("{target}", num(o.target));
  var k = pointOnArc(pct, R), kc = knobColor(pct);
  var svg = '<svg viewBox="0 0 200 122" role="img" aria-label="' + esc(label) + '"><defs>' +
    '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + (CX + R) + '" y1="0" x2="' + (CX - R) + '" y2="0">' +
    '<stop offset="0" stop-color="' + ARC_STOPS[0] + '"/><stop offset="0.5" stop-color="' + ARC_STOPS[1] + '"/><stop offset="1" stop-color="' + ARC_STOPS[2] + '"/></linearGradient></defs>' +
    ticks + '<path class="g-track" d="' + ARC + '"/>' +
    (pct > 0 ? '<path class="g-fill" d="' + ARC + '" pathLength="100" stroke="url(#' + gid + ')" stroke-dasharray="' + pct.toFixed(2) + ' 100"/>' : "") +
    '<circle class="g-knob" cx="' + k[0].toFixed(2) + '" cy="' + k[1].toFixed(2) + '" r="8" fill="' + kc + '"/>';
  if (!o.bare) {
    var rounded = Math.round(pct);
    svg += '<circle class="g-badge" cx="100" cy="51" r="16" stroke="' + kc + '"/>' +
      '<text class="g-pct" x="100" y="51" text-anchor="middle" dominant-baseline="central" fill="' + textColor(pct) + '" font-size="' + (rounded >= 100 ? 11 : 12) + '">' + rounded + "%</text>" +
      '<text class="g-amount" x="100" y="92" text-anchor="middle">' + num(o.accumulated) + "</text>" +
      '<text class="g-sub" x="100" y="109" text-anchor="middle">' + S["card.of"].replace("{target}", num(o.target)) + "</text>";
  }
  return svg + "</svg>";
}
