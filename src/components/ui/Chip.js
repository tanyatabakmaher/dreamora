import { esc } from "../../lib/dom.js";
/* Small label-over-value tile. tone: lavender (target date, gold) | sky (days left, cyan). o.icon is optional markup shown next to the label. */
export function Chip(o) {
  return '<div class="chip chip-' + o.tone + '"><span class="chip-head">' + (o.icon || "") + '<span class="chip-label">' + esc(o.label) + '</span></span><span class="chip-value num">' + esc(o.value) + "</span></div>";
}
/* Small pill (e.g. the investment track tag). */
export function Tag(o) { return '<span class="tag' + (o.id ? '" id="' + o.id : "") + '">' + esc(o.text) + "</span>"; }
