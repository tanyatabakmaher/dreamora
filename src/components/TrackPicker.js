import { esc, fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { TRACKS } from "../data/tracks.js";
import { monthsToGoal, netReturnPct, addMonths } from "../lib/calc.js";
import { heat, mmYYYY } from "../lib/heat.js";

/* Track list for the goal form: each row shows when the target is reached with that track (date + a bar: shorter = greener),
   the selected row opens and holds the return/fee fields (o.eq, an element supplied by the form). Same look as the "how much to deposit" flow.
   paint(ctx): ctx = { selectedId, ready, T, P, PMT, start (Date), ret, fee, edited }. Events: o.onSelect(id). */
function fill(t, m) { return Object.keys(m).reduce(function (s, k) { return s.replace("{" + k + "}", m[k]); }, t); }
function shortDur(n) {
  if (n < 12) return n === 1 ? S["track.dur.m1"] : n === 2 ? S["track.dur.m2"] : fill(S["track.dur.m"], { n: String(n) });
  var y = Math.round(n / 12 * 10) / 10;
  return y === 1 ? S["track.dur.y1"] : y === 2 ? S["track.dur.y2"] : fill(S["track.dur.y"], { n: String(y) });
}
function rowHtml(t) {
  return '<div class="pln-track" data-id="' + t.id + '"><button type="button" class="pln-trackhead" role="radio" aria-checked="false" aria-expanded="false">' +
    '<span class="pln-radio" aria-hidden="true"></span><span class="pln-namecol"><span class="pln-trackname">' + esc(t.labelHe.length <= 8 ? t.labelHe.replace(/ /g, " ") : t.labelHe) + "</span>" +
    (t.risk ? '<span class="pln-risk r-' + t.risk + '"><span class="pln-sig" aria-hidden="true"><i></i><i></i><i></i></span>' + esc(S["plan.risk." + t.risk]) + "</span>" : "") + "</span>" +
    '<span class="pln-side"><span class="pln-amt"><bdi class="pln-amtnum"></bdi><small></small></span></span></button>' +
    '<div class="pln-bartrack"><i aria-hidden="true"></i><span class="pln-barlbl"></span></div><div class="pln-panel" hidden></div></div>';
}
export function createTrackPicker(o) {
  var el = fromHTML('<div class="pln-formtracks"><div class="pln-lead"><b>' + esc(S["form.track"]) + "</b><span>" + esc(S["track.lead"]) + '</span></div>' +
    '<div class="pln-tracks" role="radiogroup" aria-label="' + esc(S["form.track"]) + '">' + TRACKS.map(rowHtml).join("") + "</div></div>");
  var selectedId = null, openId = null, disabled = false;
  function row(id) { return el.querySelector('.pln-track[data-id="' + id + '"]'); }
  row(TRACKS[0].id).querySelector(".pln-panel").appendChild(o.eq); /* parked (hidden) until a row opens, so the form can always find its fields */
  function placeEq() {
    var host = openId ? row(openId).querySelector(".pln-panel") : null;
    if (host && o.eq.parentNode !== host) host.appendChild(o.eq);
  }
  function setOpen(id) {
    openId = id;
    Array.prototype.forEach.call(el.querySelectorAll(".pln-track"), function (r) {
      var open = r.dataset.id === openId;
      r.classList.toggle("open", open); r.querySelector(".pln-panel").hidden = !open;
      r.querySelector(".pln-trackhead").setAttribute("aria-expanded", String(open));
    });
    placeEq();
  }
  el.addEventListener("click", function (ev) {
    var head = ev.target.closest(".pln-trackhead");
    if (!head || disabled) return;
    var id = head.parentNode.dataset.id;
    if (id === selectedId) { setOpen(openId === id ? null : id); return; }
    o.onSelect(id); /* the form switches the track and its default return and fee, then calls paint */
    setOpen(id);
  });
  function paint(ctx) {
    selectedId = ctx.selectedId;
    var rows = TRACKS.map(function (t) {
      var sel = t.id === selectedId, net = null;
      if (sel) net = Number.isFinite(ctx.ret) ? netReturnPct(ctx.ret, ctx.fee) : null;
      else if (t.defaultReturnPct !== null) net = netReturnPct(t.defaultReturnPct, t.defaultFeePct);
      var res = ctx.ready && net !== null ? monthsToGoal(ctx.T, ctx.P, ctx.PMT, net) : null;
      return { t: t, sel: sel, net: net, res: res, months: res && (res.status === "ok" || res.status === "achieved") ? res.months : null };
    });
    var ms = rows.filter(function (r) { return r.months !== null; }).map(function (r) { return r.months; });
    var lo = Math.min.apply(null, ms), hi = Math.max.apply(null, ms);
    rows.forEach(function (r) {
      var e = row(r.t.id), head = e.querySelector(".pln-trackhead"), amt = e.querySelector(".pln-amt");
      e.classList.toggle("sel", r.sel); head.setAttribute("aria-checked", String(r.sel));
      var txt, sub = "", col = "";
      if (!r.res) txt = S["plan.none"];
      else if (r.res.status === "achieved") txt = S["track.achieved"];
      else if (r.res.status === "unreachable") txt = S["track.unreachable"];
      else if (r.res.status === "tooFar") txt = S["track.tooFar"];
      else { txt = mmYYYY(addMonths(ctx.start, r.months)); sub = shortDur(r.months); }
      e.querySelector(".pln-amtnum").textContent = txt;
      e.querySelector(".pln-amt small").textContent = sub;
      var w = r.months === null || r.months === 0 ? 0 : Math.max(3, hi > 0 ? r.months / hi * 100 : 0);
      col = r.months === null ? "" : heat(hi > lo ? (r.months - lo) / (hi - lo) * 100 : 0);
      var fillEl = e.querySelector(".pln-bartrack i");
      fillEl.style.width = w + "%"; fillEl.style.background = col; amt.style.color = col;
      var lbl = e.querySelector(".pln-barlbl"), inside = w >= 38;
      lbl.hidden = r.net === null;
      lbl.textContent = (r.sel && ctx.edited ? "✎ " : "") + (r.net === null ? "" : fill(S["plan.netTag"], { pct: String(r.net) }));
      lbl.classList.toggle("in", inside);
      lbl.style.insetInlineStart = inside ? "10px" : "calc(" + w + "% + 8px)"; lbl.style.insetInlineEnd = "auto";
    });
  }
  return {
    el: el, paint: paint,
    open: function (id) { setOpen(id); },
    isOpen: function () { return openId !== null; },
    setDisabled: function (b) { disabled = !!b; Array.prototype.forEach.call(el.querySelectorAll(".pln-trackhead"), function (h) { h.disabled = disabled; }); }
  };
}
