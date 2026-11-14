/* One shared toast element: <div class="toast" id="toast" role="status" hidden>. */
var timer;
/* kind: "error" (default) or "success". */
export function showToast(text, kind) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text; el.hidden = false;
  el.classList.toggle("success", kind === "success");
  clearTimeout(timer);
  timer = setTimeout(function () { el.hidden = true; }, 6000);
}
