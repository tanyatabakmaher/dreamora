import { esc } from "../../lib/dom.js";
/* A labelled input with its own hint and error line. Ids: <id> (control), <id>-field (wrapper), <id>-err (error), <id>-hint (hint).
   Pass `control` to supply your own control markup (select, password wrapper, etc). */
export function Field(o) {
  var type = o.type || "text";
  var control = o.control || '<input class="input' + (o.num ? " num" : "") + '" id="' + o.id + '" type="' + type + '"' + (o.attrs ? " " + o.attrs : "") + ">";
  return '<div class="field" id="' + o.id + '-field"' + (o.hidden ? " hidden" : "") + ">" +
    '<label for="' + o.id + '">' + esc(o.label) + "</label>" + control +
    (o.hint ? '<div class="hint" id="' + o.id + '-hint">' + esc(o.hint) + "</div>" : "") +
    '<div class="err" id="' + o.id + '-err"></div></div>';
}
export function setFieldError(root, id, msg) {
  var wrap = root.querySelector("#" + id + "-field"), err = root.querySelector("#" + id + "-err"), inp = root.querySelector("#" + id);
  var show = !!msg;
  wrap.classList.toggle("invalid", show);
  err.textContent = show ? msg : "";
  if (inp) inp.setAttribute("aria-invalid", show ? "true" : "false");
}
