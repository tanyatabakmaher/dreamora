/* One shared toast element: <div class="toast" id="toast" role="status" hidden>. */
var timer;
export function showToast(text) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text; el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(function () { el.hidden = true; }, 6000);
}
