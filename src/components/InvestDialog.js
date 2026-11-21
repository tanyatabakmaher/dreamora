import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { TRACKS, trackById } from "../data/tracks.js";
import { netReturnPct, toISODate, parseISODate } from "../lib/calc.js";
import { money, todayDate, fmtDate, durText } from "../lib/format.js";
import { heat, mmYYYY } from "../lib/heat.js";
import { summarize, investmentView, investDeposit } from "../lib/budget.js";
import { Field, setFieldError } from "./ui/Field.js";
import { Button } from "./ui/Button.js";
import { CalendarIcon } from "./ui/Icons.js";
import { createModal } from "./ui/Modal.js";
import { showToast } from "./ui/Toast.js";
import { createBudgetHero } from "./BudgetHero.js";

/* "ההשקעה שלי": the dialog behind the investment row of the budget summary. The money that is not allocated to a goal (plus what is left of the monthly saving after the goals) is invested in a track since a date.
   Top: the budget picture fading into the sheet, a panel with two rings (outer: put in vs. interest earned, inner: the monthly deposit out of the monthly saving) and three coloured lines.
   Below, two tabs: "track" (the same track list as the goal flow: risk tag, bar with the net yearly return, average monthly interest on the side, open row = return - fee for this investment only; then the start date)
   and "history" (the periods in the tracks the user went through). Switching to another track keeps the previous one as a past period.
   o.budgetRepo, o.goals() -> the goals, o.onSaved(budget). open(openerEl). */
function fill(t, m) { return Object.keys(m).reduce(function (s, k) { return s.split("{" + k + "}").join(m[k]); }, t); }
function pctOf(v, total) { return total > 0 ? Math.max(0, Math.min(100, v / total * 100)) : 0; }

function rings(size, outer, inner) {
  var sw = 8, h = size / 2, r1 = (size - sw) / 2, r2 = r1 - sw - 3;
  function arc(r, parts) {
    var c = 2 * Math.PI * r, off = 0, out = '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" class="bh-track" stroke-width="' + sw + '"/>';
    parts.forEach(function (p) {
      if (p.p <= 0) return;
      var l = c * p.p / 100;
      out += '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" class="' + p.cls + '" stroke-width="' + sw + '" stroke-dasharray="' + l.toFixed(1) + " " + (c - l).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 ' + h + " " + h + ')"/>';
      off += l;
    });
    return out;
  }
  return '<svg class="bh-rings" viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' + arc(r1, outer) + arc(r2, inner) + "</svg>";
}
function trackRowHtml(t) {
  return '<div class="pln-track" data-id="' + t.id + '"><button type="button" class="pln-trackhead" role="radio" aria-checked="false" aria-expanded="false">' +
    '<span class="pln-radio" aria-hidden="true"></span><span class="pln-namecol"><span class="pln-trackname">' + esc(t.labelHe.length <= 8 ? t.labelHe.replace(/ /g, " ") : t.labelHe) + "</span>" +
    (t.risk ? '<span class="pln-risk r-' + t.risk + '"><span class="pln-sig" aria-hidden="true"><i></i><i></i><i></i></span>' + esc(S["plan.risk." + t.risk]) + "</span>" : "") + "</span>" +
    '<span class="pln-side"><span class="pln-amt iv-amt"><bdi class="pln-amtnum"></bdi><small>' + esc(S["inv.track.perMonth"]) + "</small></span></span></button>" +
    '<div class="pln-bartrack"><i aria-hidden="true"></i><span class="pln-barlbl"></span></div>' +
    '<div class="pln-panel" hidden><div class="pln-eq">' +
    Field({ id: "inv-ret-" + t.id, label: S["plan.track.returnShort"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" max="100" step="any"' }) +
    '<span class="pln-op" aria-hidden="true">−</span>' +
    Field({ id: "inv-fee-" + t.id, label: S["plan.track.feeShort"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" max="10" step="any"' }) +
    '<span class="pln-op" aria-hidden="true">=</span><span class="pln-netchip" aria-live="polite"></span></div>' +
    '<div class="pln-net" hidden></div>' +
    '<div class="pln-eqfoot" hidden><span></span><button type="button" class="pln-link pln-reset">' + esc(S["plan.track.reset"]) + "</button></div>" +
    '<div class="pln-local">' + esc(S["inv.track.local"]) + "</div></div></div>";
}

export function createInvestDialog(o) {
  var root = fromHTML('<div class="sheet planflow inv" data-tab="track" role="dialog" aria-modal="true" aria-labelledby="inv-title">' +
    '<div class="pln-top"><button type="button" class="pln-icon" id="inv-close" aria-label="' + esc(S["form.close"]) + '">✕</button></div>' +
    '<div class="inv-seg" role="tablist"><i aria-hidden="true"></i>' +
    '<button type="button" role="tab" id="inv-tab-track" data-tab="track" aria-selected="true">' + esc(S["inv.tab.track"]) + "</button>" +
    '<button type="button" role="tab" id="inv-tab-history" data-tab="history" aria-selected="false"></button></div>' +
    '<section class="inv-pane" id="inv-pane-track"><h3 class="inv-sl">' + esc(S["inv.tracks"]) + "</h3>" +
    '<div class="pln-tracks" id="inv-tracks" role="radiogroup" aria-label="' + esc(S["inv.tracks"]) + '"></div><div class="err" id="inv-track-err" role="alert"></div>' +
    '<div class="inv-led"><label class="inv-fl" for="inv-date"><span class="inv-ic" aria-hidden="true">' + CalendarIcon() + '</span><span class="inv-fl-t">' + esc(S["inv.date"]) + "</span>" +
    '<input class="inv-date" id="inv-date" type="date" aria-label="' + esc(S["inv.date.aria"]) + '"></label></div><div class="err" id="inv-date-err" role="alert"></div>' +
    '<div class="inv-actions">' + Button({ id: "inv-save", label: S["inv.save"], block: true }) + "</div></section>" +
    '<section class="inv-pane" id="inv-pane-history" hidden><h3 class="inv-sl">' + esc(S["inv.hist.title"]) + '</h3><div id="inv-hist"></div></section></div>');
  var $ = function (sel) { return root.querySelector(sel); };
  var modal = createModal({ sheet: root });
  /* picture + title row (the panel is filled in by paintHero) */
  var hero = createBudgetHero();
  hero.top.appendChild($(".pln-top"));
  hero.top.appendChild(fromHTML('<h2 class="bh-title" id="inv-title">' + esc(S["inv.title"]) + "</h2>"));
  root.insertBefore(hero.el, root.firstChild);
  var panel = hero.el.querySelector(".bh-panel");

  var budget = null, today = todayDate(), st = null, view = null, sum = null, deposit = 0, saving = false;

  function line(cls, label, html) { return '<div class="bh-line"><span class="bh-dot ' + cls + '"></span><span class="bh-lbl">' + esc(label) + '</span><div class="bh-left">' + html + "</div></div>"; }
  function b(cls, amount) { return '<b class="iv-' + cls + '">' + esc(money(amount)) + "</b>"; }
  /* Rings: outer = what was put in (blue) vs. interest earned (gold) of today's value; inner = this month's deposit out of the monthly saving (mint). */
  function paintHero() {
    var value = view ? view.value : sum.unallocated, put = view ? view.invested : sum.unallocated, earned = view ? view.earned : 0;
    var ep = pctOf(earned, value);
    panel.hidden = false;
    panel.innerHTML = '<div class="bh-ring">' + rings(78, [{ p: 100 - ep, cls: "bh-i" }, { p: ep, cls: "bh-e" }], [{ p: pctOf(deposit, sum.saving), cls: "bh-m" }]) + "</div>" +
      '<div class="bh-lines">' +
      line("e", view ? S["inv.l.value"] : S["inv.l.valueIdle"], b("gd", value)) +
      line("i", S["inv.l.put"], b("bl", put) + (view ? ' <span class="iv-gd">' + esc(S["inv.l.plus"]) + "</span> " + b("gd", earned) : "")) +
      line("m", S["inv.l.monthly"], fill(S["inv.l.monthlyOf"], { amount: b("mn", deposit), total: esc(money(sum.saving)) })) + "</div>";
  }

  /* ---- tracks ---- */
  function rowNet(t) {
    var e = st.edits[t.id] || {};
    var ret = "ret" in e ? e.ret : t.defaultReturnPct, fee = "fee" in e ? (e.fee === "" ? 0 : e.fee) : t.defaultFeePct;
    if (ret === null || ret === undefined || !Number.isFinite(ret) || ret < 0 || ret > 100 || !Number.isFinite(fee) || fee < 0 || fee > 10) return null;
    return netReturnPct(ret, fee);
  }
  function row(id) { return $('.pln-track[data-id="' + id + '"]'); }
  function paintTracks() {
    var nets = TRACKS.map(rowNet), mx = Math.max.apply(null, nets.filter(function (n) { return n !== null; }).concat([0]));
    TRACKS.forEach(function (t, i) {
      var el = row(t.id), net = nets[i], sel = t.id === st.trackId, open = t.id === st.openId, e = st.edits[t.id];
      el.classList.toggle("sel", sel); el.classList.toggle("open", open);
      var head = el.querySelector(".pln-trackhead");
      head.setAttribute("aria-checked", String(sel)); head.setAttribute("aria-expanded", String(open));
      el.querySelector(".pln-panel").hidden = !open;
      el.querySelector(".pln-amtnum").textContent = net === null ? S["plan.none"] : (net / 12).toFixed(2) + "%";
      var w = net === null || mx <= 0 ? 0 : Math.max(3, net / mx * 100), col = net === null ? "" : heat(mx > 0 ? (1 - net / mx) * 60 : 0);
      var fillEl = el.querySelector(".pln-bartrack i"); fillEl.style.width = w + "%"; fillEl.style.background = col;
      var lbl = el.querySelector(".pln-barlbl"), inside = w >= 38;
      lbl.hidden = net === null;
      lbl.textContent = (e ? "✎ " : "") + (net === null ? "" : fill(S["inv.track.net"], { pct: String(net) }));
      lbl.classList.toggle("in", inside);
      lbl.style.insetInlineStart = inside ? "10px" : "calc(" + w + "% + 8px)"; lbl.style.insetInlineEnd = "auto";
      var msg = el.querySelector(".pln-net"), retEmpty = $("#inv-ret-" + t.id).value === "";
      msg.hidden = net !== null; msg.textContent = net === null ? (retEmpty ? S["plan.track.needReturn"] : S["plan.track.badValues"]) : "";
      el.querySelector(".pln-netchip").textContent = net === null ? "—" : fill(S["plan.netTag"], { pct: String(net) });
      el.querySelector(".pln-eqfoot").hidden = !e;
    });
  }
  function buildTracks() {
    $("#inv-tracks").innerHTML = TRACKS.map(trackRowHtml).join("");
    TRACKS.forEach(function (t) {
      var e = st.edits[t.id] || {};
      $("#inv-ret-" + t.id).value = "ret" in e ? (e.ret === null ? "" : e.ret) : (t.defaultReturnPct === null ? "" : t.defaultReturnPct);
      $("#inv-fee-" + t.id).value = "fee" in e ? e.fee : t.defaultFeePct;
    });
  }
  function setDate(iso) { st.dateISO = iso; $("#inv-date").value = iso; $("#inv-date-err").textContent = ""; }
  $("#inv-tracks").addEventListener("click", function (ev) {
    var r = ev.target.closest(".pln-track"); if (!r) return;
    var id = r.dataset.id, t = trackById(id);
    if (ev.target.closest(".pln-reset")) {
      delete st.edits[id];
      $("#inv-ret-" + id).value = t.defaultReturnPct === null ? "" : t.defaultReturnPct; $("#inv-fee-" + id).value = t.defaultFeePct;
      paintTracks(); return;
    }
    if (!ev.target.closest(".pln-trackhead")) return;
    /* pressing a row selects it and opens it; pressing the open row only closes it */
    if (st.openId === id) st.openId = null;
    else {
      st.openId = id; st.trackId = id; $("#inv-track-err").textContent = "";
      /* a new track starts today unless the user picked a date; going back to the current track brings back its own start */
      if (!st.dateTouched) setDate(budget.investTrack && id === budget.investTrack ? budget.investSince : toISODate(today));
    }
    paintTracks();
  });
  $("#inv-tracks").addEventListener("input", function (ev) {
    var m = /^inv-(ret|fee)-(.+)$/.exec(ev.target.id || ""); if (!m) return;
    var id = m[2], t = trackById(id), e = st.edits[id] || (st.edits[id] = {}), val = ev.target.value;
    if (m[1] === "ret") e.ret = val === "" ? null : Number(val); else e.fee = val === "" ? "" : Number(val);
    var sameRet = "ret" in e ? e.ret === t.defaultReturnPct : true, sameFee = "fee" in e ? (e.fee === "" ? 0 : e.fee) === t.defaultFeePct : true;
    if (sameRet && sameFee) delete st.edits[id];
    paintTracks();
    if (rowNet(t) === null && val !== "") setFieldError(root, "inv-" + m[1] + "-" + id, m[1] === "ret" ? S["error.returnRange"] : S["error.feeRange"]);
    else { setFieldError(root, "inv-ret-" + id, ""); setFieldError(root, "inv-fee-" + id, ""); }
  });
  $("#inv-date").addEventListener("input", function () { st.dateISO = this.value; st.dateTouched = true; $("#inv-date-err").textContent = ""; });

  /* ---- history ---- */
  function paintHistory() {
    var n = view ? view.periods.length : 0;
    $("#inv-tab-history").textContent = S["inv.tab.history"] + (n ? " · " + n : "");
    var host = $("#inv-hist");
    if (!view) { host.innerHTML = '<p class="inv-empty">' + esc(S["inv.hist.none"]) + "</p>"; return; }
    host.innerHTML = '<div class="inv-hist">' + view.periods.map(function (p) {
      var when = mmYYYY(p.since) + " " + esc(p.until ? S["inv.hist.to"] + " " + mmYYYY(p.until) : S["inv.hist.until"]);
      return '<div class="inv-hr' + (p.current ? " cur" : "") + '"><div class="inv-hr-a"><span>' + esc(p.label) + '</span><b>' + esc((p.netPct / 12).toFixed(2)) + "%</b></div>" +
        '<div class="inv-hr-b">' + when + (p.months > 0 ? " · " + esc(durText(p.months)) : "") + "</div></div>";
    }).join("") + "</div>" + (n < 2 ? '<p class="inv-empty">' + esc(S["inv.hist.empty"]) + "</p>" : "");
  }
  function setTab(t) {
    root.dataset.tab = t;
    ["track", "history"].forEach(function (k) { $("#inv-pane-" + k).hidden = k !== t; $("#inv-tab-" + k).setAttribute("aria-selected", String(k === t)); });
  }
  $(".inv-seg").addEventListener("click", function (ev) { var bt = ev.target.closest("button[data-tab]"); if (bt) setTab(bt.dataset.tab); });

  /* ---- save ---- */
  function save() {
    if (saving) return;
    var id = st.trackId; $("#inv-track-err").textContent = ""; $("#inv-date-err").textContent = "";
    if (!id) { $("#inv-track-err").textContent = S["inv.err.track"]; $("#inv-tracks").scrollIntoView({ block: "center" }); return; }
    var t = trackById(id);
    if (rowNet(t) === null) { st.openId = id; paintTracks(); $("#inv-track-err").textContent = S["inv.err.net"]; return; }
    var d = st.dateISO, todayISO = toISODate(today), hist = (budget.investHistory || []).slice();
    var floor = hist.length ? hist[hist.length - 1].until : "";
    if (!d || !parseISODate(d) || d > todayISO) { $("#inv-date-err").textContent = S["inv.err.date"]; return; }
    if (floor && d < floor) { $("#inv-date-err").textContent = fill(S["inv.err.dateFloor"], { date: fmtDate(parseISODate(floor)) }); return; }
    var e = st.edits[id], ret = null, fee = null;
    if (e) { ret = "ret" in e ? e.ret : t.defaultReturnPct; fee = "fee" in e ? (e.fee === "" ? 0 : e.fee) : t.defaultFeePct; }
    var next = Object.assign({}, budget);
    /* another track from a later date: the one before it becomes a past period (a date on or before its start simply replaces it) */
    if (budget.investTrack && budget.investTrack !== id && d > budget.investSince) {
      hist.push({ trackId: budget.investTrack, since: budget.investSince, until: d, ret: budget.investRet === undefined ? null : budget.investRet, fee: budget.investFee === undefined ? null : budget.investFee });
    }
    next.investTrack = id; next.investSince = d; next.investRet = ret; next.investFee = fee; next.investHistory = hist;
    saving = true; var btn = $("#inv-save"); btn.disabled = true;
    o.budgetRepo.save(next).then(function () {
      showToast(S["inv.saved"], "success"); modal.close(); if (o.onSaved) o.onSaved(next);
    }).catch(function () { showToast(S["inv.saveFailed"]); }).then(function () { saving = false; btn.disabled = false; });
  }
  $("#inv-save").addEventListener("click", save);
  $("#inv-close").addEventListener("click", function () { modal.close(); });
  root.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && ev.target.tagName === "INPUT" && ev.target.type !== "date") ev.preventDefault(); });

  function init() {
    today = todayDate();
    sum = summarize(budget, o.goals ? o.goals() : [], today);
    deposit = investDeposit(sum);
    view = sum.unallocated > 0 || budget.investTrack ? investmentView(budget, sum.unallocated, today, deposit) : null;
    st = { trackId: budget.investTrack || null, openId: null, edits: {}, dateISO: budget.investSince || toISODate(today), dateTouched: false };
    if (budget.investTrack && (budget.investRet !== null && budget.investRet !== undefined || budget.investFee !== null && budget.investFee !== undefined)) {
      var t = trackById(budget.investTrack);
      st.edits[t.id] = { ret: budget.investRet !== null && budget.investRet !== undefined ? budget.investRet : t.defaultReturnPct, fee: budget.investFee !== null && budget.investFee !== undefined ? budget.investFee : t.defaultFeePct };
    }
    saving = false; $("#inv-save").disabled = false; $("#inv-track-err").textContent = ""; $("#inv-date-err").textContent = "";
    $("#inv-date").max = toISODate(today);
    buildTracks(); paintTracks(); setDate(st.dateISO); paintHero(); paintHistory(); setTab("track");
  }
  return {
    open: function (openerEl) {
      o.budgetRepo.load().then(function (bd) {
        if (!bd) { showToast(S["inv.loadFailed"]); return; }
        budget = bd; init(); modal.open(openerEl, null);
      }).catch(function (e) { if (window.console) console.error(e); showToast(S["inv.loadFailed"]); });
    },
    isOpen: function () { return modal.isOpen(); },
    destroy: function () { modal.destroy(); }
  };
}
