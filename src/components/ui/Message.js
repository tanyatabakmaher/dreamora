/* Inline notice. kind: info | error. Errors use role=alert, info uses role=status. */
export function Message(o) {
  return '<div class="msg msg-' + o.kind + '"' + (o.id ? ' id="' + o.id + '"' : "") + ' role="' + (o.kind === "error" ? "alert" : "status") + '"' + (o.hidden === false ? "" : " hidden") + "></div>";
}
export function showMessage(el, text) { el.textContent = text; el.hidden = false; }
export function hideMessage(el) { el.hidden = true; el.textContent = ""; }
