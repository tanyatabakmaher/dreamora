/* Modal overlay around any element with class "sheet". Handles backdrop click, Escape (top-most only),
   body scroll lock and returning focus to whatever opened it. */
var stack = [];
var wired = false;
function onKey(ev) {
  if (ev.key !== "Escape" || !stack.length) return;
  stack[stack.length - 1].close();
}
export function createModal(o) {
  if (!wired) { document.addEventListener("keydown", onKey); wired = true; }
  var overlay = document.createElement("div");
  overlay.className = "overlay" + (o.center ? " center" : "");
  overlay.hidden = true;
  overlay.appendChild(o.sheet);
  document.body.appendChild(overlay);
  var opener = null;
  var api = {
    el: overlay,
    isOpen: function () { return !overlay.hidden; },
    open: function (openerEl, focusSel) {
      opener = openerEl || null;
      document.body.appendChild(overlay); /* last opened sits on top */
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      stack.push(api);
      var f = focusSel && overlay.querySelector(focusSel);
      if (f) setTimeout(function () { f.focus(); }, 30);
    },
    close: function () {
      if (overlay.hidden) return;
      overlay.hidden = true;
      stack = stack.filter(function (m) { return m !== api; });
      if (!stack.length) document.body.style.overflow = "";
      if (opener && document.contains(opener)) { try { opener.focus(); } catch (e) {} }
      if (o.onClose) o.onClose();
    },
    destroy: function () {
      stack = stack.filter(function (m) { return m !== api; });
      if (!stack.length) document.body.style.overflow = "";
      overlay.remove();
    }
  };
  overlay.addEventListener("keydown", function (ev) { /* keep Tab inside the dialog */
    if (ev.key !== "Tab") return;
    var f = Array.prototype.filter.call(overlay.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  overlay.addEventListener("mousedown", function (ev) { if (ev.target === overlay) api.close(); });
  return api;
}
