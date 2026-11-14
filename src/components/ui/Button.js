import { esc } from "../../lib/dom.js";
/* <button> markup. variant: primary | ghost | danger | solid-danger | link. icon: optional markup placed before the label. */
export function Button(o) {
  var cls = o.variant === "link" ? "linkbtn" : "btn btn-" + (o.variant || "primary");
  if (o.block) cls += " btn-block";
  if (o.grow) cls += " grow";
  if (o.extraClass) cls += " " + o.extraClass;
  return '<button type="' + (o.type || "button") + '" class="' + cls + '"' + (o.id ? ' id="' + o.id + '"' : "") +
    (o.hidden ? " hidden" : "") + (o.attrs ? " " + o.attrs : "") + ">" + (o.icon || "") + esc(o.label || "") + "</button>";
}
export function IconButton(o) {
  return '<button type="button" class="icon-btn"' + (o.id ? ' id="' + o.id + '"' : "") + ' aria-label="' + esc(o.label) + '">' + o.glyph + "</button>";
}
