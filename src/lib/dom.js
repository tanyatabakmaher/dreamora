/* Tiny DOM helpers shared by every component. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
}
export function fromHTML(html) {
  var t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export function q(root, sel) { return root.querySelector(sel); }
export function uid() {
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
