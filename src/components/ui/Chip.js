import { esc } from "../../lib/dom.js";
/* Small label-over-value tile. tone: lavender | sky. */
export function Chip(o) {
  return '<div class="chip chip-' + o.tone + '"><span class="chip-label">' + esc(o.label) + '</span><span class="chip-value num">' + esc(o.value) + "</span></div>";
}
/* Small pill (e.g. the investment track tag). */
export function Tag(o) { return '<span class="tag' + (o.id ? '" id="' + o.id : "") + '">' + esc(o.text) + "</span>"; }
