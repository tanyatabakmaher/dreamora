import { esc } from "../../lib/dom.js";
/* Dropdown menu opened from a button. items: [{ id, label, icon (markup), danger, onSelect }]. Add an item to the list to add an action.
   Returns { el, close, destroy }. Place `el` in the same positioned wrapper as the button. */
export function createMenu(o) {
  var btn = o.button, items = o.items;
  var el = document.createElement("div");
  el.className = "menu"; el.setAttribute("role", "menu"); el.hidden = true;
  el.innerHTML = items.map(function (it) {
    return '<button type="button" role="menuitem" class="menu-item' + (it.danger ? " danger" : "") + '" data-id="' + esc(it.id) + '">' +
      (it.icon || "") + "<span>" + esc(it.label) + "</span></button>";
  }).join("");
  function isOpen() { return !el.hidden; }
  function open() {
    el.hidden = false; btn.setAttribute("aria-expanded", "true");
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    var first = el.querySelector(".menu-item"); if (first) first.focus();
  }
  function close(returnFocus) {
    if (!isOpen()) return;
    el.hidden = true; btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    if (returnFocus !== false) btn.focus();
  }
  function onOutside(ev) { if (!el.contains(ev.target) && !btn.contains(ev.target)) close(false); }
  function onKey(ev) {
    if (ev.key === "Escape") { ev.stopPropagation(); close(); return; }
    var btns = Array.prototype.slice.call(el.querySelectorAll(".menu-item")), i = btns.indexOf(document.activeElement);
    if (ev.key === "ArrowDown") { ev.preventDefault(); btns[(i + 1) % btns.length].focus(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    else if (ev.key === "Tab") close(false);
  }
  btn.setAttribute("aria-haspopup", "menu"); btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", function () { if (isOpen()) close(); else open(); });
  el.addEventListener("click", function (ev) {
    var b = ev.target.closest(".menu-item"); if (!b) return;
    var it = items.find(function (x) { return x.id === b.dataset.id; });
    close(); if (it && it.onSelect) it.onSelect();
  });
  return { el: el, close: close, destroy: function () { close(false); el.remove(); } };
}
