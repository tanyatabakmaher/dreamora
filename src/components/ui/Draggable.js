/* Lets a fixed-position button be dragged to a new spot (phones). A tap still clicks; a drag past a few pixels moves it, keeps it fully on screen,
   and remembers the spot (localStorage, per browser). onDrag() fires once a drag starts, so the caller can ignore the click that follows. */
export function makeDraggable(btn, storeKey, onDrag) {
  var margin = 6;
  function clamp(x, y) {
    var w = btn.offsetWidth, h = btn.offsetHeight;
    return { x: Math.min(Math.max(x, margin), window.innerWidth - w - margin), y: Math.min(Math.max(y, margin), window.innerHeight - h - margin) };
  }
  function place(x, y) {
    var c = clamp(x, y);
    btn.style.left = c.x + "px"; btn.style.top = c.y + "px"; btn.style.right = "auto"; btn.style.bottom = "auto";
    return c;
  }
  function restore() {
    if (!btn.offsetWidth) return; /* hidden (desktop) */
    try {
      var p = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (p && typeof p.fx === "number" && typeof p.fy === "number") place(p.fx * window.innerWidth, p.fy * window.innerHeight);
    } catch (e) {}
  }
  var start = null;
  btn.style.touchAction = "none";
  btn.addEventListener("pointerdown", function (ev) {
    var r = btn.getBoundingClientRect();
    start = { px: ev.clientX, py: ev.clientY, x: r.left, y: r.top, moved: false, id: ev.pointerId };
  });
  btn.addEventListener("pointermove", function (ev) {
    if (!start || ev.pointerId !== start.id) return;
    var dx = ev.clientX - start.px, dy = ev.clientY - start.py;
    if (!start.moved && Math.hypot(dx, dy) < 8) return;
    if (!start.moved) { start.moved = true; try { btn.setPointerCapture(ev.pointerId); } catch (e) {} onDrag(); btn.classList.add("dragging"); }
    place(start.x + dx, start.y + dy);
  });
  function end(ev) {
    if (!start || ev.pointerId !== start.id) return;
    if (start.moved) {
      var r = btn.getBoundingClientRect();
      try { localStorage.setItem(storeKey, JSON.stringify({ fx: r.left / window.innerWidth, fy: r.top / window.innerHeight })); } catch (e) {}
      btn.classList.remove("dragging");
    }
    start = null;
  }
  btn.addEventListener("pointerup", end);
  btn.addEventListener("pointercancel", end);
  window.addEventListener("resize", restore);
  /* the button is not laid out until the screen is attached (and not at all on desktop): restore once it has a size */
  if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (btn.offsetWidth) { ro.disconnect(); restore(); } }); ro.observe(btn); }
  restore();
}
