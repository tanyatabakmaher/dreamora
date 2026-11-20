import { esc, fromHTML, uid } from "../lib/dom.js";
import { S } from "../strings.js";
import { TRACKS, EMOJI_SUGGESTED } from "../data/tracks.js";
import { toISODate, parseISODate, addMonths, monthsUntil, requiredDeposit, balanceAfter } from "../lib/calc.js";
import { planRows } from "../lib/reversePlan.js";
import { todayDate, money, durText, fmtAmountInput, parseAmount } from "../lib/format.js";
import { Field, setFieldError } from "./ui/Field.js";
import { Button } from "./ui/Button.js";
import { createModal } from "./ui/Modal.js";
import { createConfirm } from "./ConfirmDialog.js";
import { IconPicker, wireIconPicker } from "./IconPicker.js";
import { heat, mmYYYY } from "../lib/heat.js";
import { createBudgetHero } from "./BudgetHero.js";
import { createSharingSection } from "./SharingSection.js";
import { diffMembers, hasChanges } from "../lib/share.js";

/* "How much to deposit?" form: one screen with the same structure as the regular goal form. Name, picture, target amount, fixed target date and an optional starting amount;
   below them every track shows the monthly deposit it needs to reach the date (the open row edits return and fee for this goal only), then a summary of the chosen track,
   the privacy settings and a fixed save bar. onSave(goal, sharingDiff|null) is the same save the regular goal form uses. open(openerEl). */
var MAX_MONTHS = 600;
function numOrNaN(v) { return v === "" || v === null || v === undefined ? NaN : Number(parseAmount(v)); }
function fill(t, m) { return Object.keys(m).reduce(function (s, k) { return s.replace("{" + k + "}", m[k]); }, t); }

export function createGoalPlanFlow(o) {
  var root = fromHTML('<div class="sheet planflow" role="dialog" aria-modal="true" aria-labelledby="pln-herotitle">' +
    '<div class="pln-top"><button type="button" class="pln-icon" id="pln-close" aria-label="' + esc(S["form.close"]) + '">\u2715</button></div>' +
    Field({ id: "pln-name", label: S["form.name"], attrs: 'maxlength="40" autocomplete="off" placeholder="' + esc(S["form.name.placeholder"]) + '"' }) +
    IconPicker("plnp") +
    Field({ id: "pln-target", label: S["form.target"], type: "text", num: true, attrs: 'inputmode="decimal" autocomplete="off"' }) +
    Field({ id: "pln-date", label: S["plan.date"], type: "date", num: true, hint: S["plan.date.hint"] }) +
    Field({ id: "pln-initial", label: S["plan.initial"], type: "text", num: true, attrs: 'inputmode="decimal" autocomplete="off"' }) +
    '<div class="pln-chip" id="pln-initialchip" hidden></div>' +
    '<h3 class="pln-title">' + esc(S["plan.s2.title"]) + '</h3><p class="pln-sub" id="pln-trackssub">' + esc(S["plan.s2.sub"]) + "</p>" +
    '<p class="pln-wait" id="pln-wait">' + esc(S["plan.wait"]) + "</p>" +
    '<div class="pln-tracks" id="pln-tracks" role="radiogroup" aria-label="' + esc(S["form.track"]) + '"></div>' +
    '<div class="err" id="pln-track-err" role="alert"></div>' +
    '<div class="pln-summary" id="pln-summary" hidden>' +
    '<div class="pln-hero"><div class="pln-herolabel">' + esc(S["plan.s3.deposit"]) + '</div><div class="pln-heroamt" id="pln-heroamt"></div><div class="pln-herosub" id="pln-herosub"></div></div>' +
    '<div class="pln-timeline"><div class="pln-line"><i></i></div><div class="pln-ends"><span id="pln-startlbl"></span><span id="pln-endlbl"></span></div><div class="pln-dur" id="pln-dur"></div></div>' +
    '<div class="pln-comp" id="pln-comp"></div><div class="pln-legend" id="pln-legend"></div>' +
    '<p class="pln-disc">' + esc(S["plan.disclaimer"]) + "</p></div>" +
    '<div id="pln-sharing-slot"></div>' +
    '<div class="actions pln-actions">' + Button({ id: "pln-save", label: S["plan.s3.save"], grow: true }) + Button({ id: "pln-cancel", variant: "ghost", label: S["form.cancel"] }) + "</div></div>");
  var $ = function (sel) { return root.querySelector(sel); };
  var modal = createModal({ sheet: root });
  /* Picture behind the top bar plus how much of the free budget this goal uses (o.avail() -> numbers, or null without a budget). */
  var hero = createBudgetHero();
  hero.top.appendChild($(".pln-top"));
  var heroTitle = fromHTML('<h2 class="bh-title" id="pln-herotitle"></h2>');
  hero.top.appendChild(heroTitle);
  function paintTitle() { heroTitle.textContent = $("#pln-name").value.trim() || S["form.title.create"]; }
  root.insertBefore(hero.el, root.firstChild);
  var picker = wireIconPicker(root, EMOJI_SUGGESTED, function () { dirty = true; hero.setImage(picker.get().image); }, "plnp");
  var leave = createConfirm({ title: S["plan.leave.title"], body: S["plan.leave.body"], yes: S["plan.leave.yes"], no: S["plan.leave.no"] });
  var dirty = false, saved = false, today = todayDate();
  var st = { T: NaN, months: 0, dateISO: "", P: 0, trackId: null, openId: null, edits: {} }, rows = [], tracksBuilt = false, ready = false, plan = null;
  var sharing = o.sharing ? createSharingSection({ ownEmail: function () { return o.ownEmail ? o.ownEmail() : ""; } }) : null;
  if (sharing) $("#pln-sharing-slot").appendChild(sharing.el);

  /* Closing with unsaved input asks first; Escape and the backdrop both go through modal.close. */
  var realClose = modal.close;
  modal.close = function () {
    if (!modal.isOpen()) return;
    if (!dirty || saved) { realClose(); return; }
    leave.ask($("#pln-close")).then(function (yes) { if (yes) realClose(); });
  };

  function paintHero() {
    paintTitle();
    var cur = ready ? rows.find(function (r) { return r.id === st.trackId; }) : null;
    hero.update(o.avail ? o.avail() : null, ready ? st.P : 0, cur && cur.deposit !== null ? cur.deposit : 0);
  }
  root.addEventListener("input", function () { setTimeout(paintHero, 0); });
  root.addEventListener("click", function () { setTimeout(paintHero, 0); });

  /* ---- the goal details ---- */
  function fmtInput(el) {
    var pos = el.selectionStart, before = el.value, digits = before.slice(0, pos).replace(/[^\d.]/g, "").length, f = fmtAmountInput(before), n = 0, np = f.length;
    for (var j = 0; j < f.length; j++) { if (n === digits) { np = j; break; } if (/[\d.]/.test(f[j])) n++; }
    if (n === digits && np === f.length && digits === 0) np = 0;
    el.value = f; try { el.setSelectionRange(np, np); } catch (e) {}
  }
  function readDetails() {
    var name = $("#pln-name").value.trim(), T = numOrNaN($("#pln-target").value), dv = $("#pln-date").value, errs = {};
    if (!name) errs.name = S["error.required"];
    if ($("#pln-target").value === "") errs.target = S["error.required"];
    else if (!(T > 0) || T > 1e9) errs.target = S["error.positiveNumber"];
    var months = 0;
    if (!dv) errs.date = S["error.required"];
    else { months = monthsUntil(today, parseISODate(dv)); if (months < 1) errs.date = S["plan.error.dateMin"]; else if (months > MAX_MONTHS) errs.date = S["plan.error.date"]; }
    return { name: name, T: T, dv: dv, months: months, errs: errs };
  }
  function showDetailErrors(r) { setFieldError(root, "pln-name", r.errs.name || ""); setFieldError(root, "pln-target", r.errs.target || ""); setFieldError(root, "pln-date", r.errs.date || ""); }
  /* Target and date are all the tracks need: once both are valid the list appears and follows every change. */
  function syncReady() {
    var r = readDetails(), ok = !r.errs.target && !r.errs.date;
    if (ok) { st.T = r.T; st.months = r.months; st.dateISO = r.dv; }
    ready = ok;
    $("#pln-wait").hidden = ok; $("#pln-tracks").hidden = !ok; $("#pln-trackssub").hidden = !ok;
    if (ok) { if (!tracksBuilt) buildTracks(); paintTracks(); } else { $("#pln-summary").hidden = true; $("#pln-initialchip").hidden = true; plan = null; }
    paintHero();
  }
  ["pln-name", "pln-target", "pln-date"].forEach(function (id) {
    $("#" + id).addEventListener("input", function () {
      dirty = true;
      if (id === "pln-target") fmtInput(this);
      var r = readDetails();
      if ($("#" + id + "-field").classList.contains("invalid") || (id === "pln-date" && this.value)) showDetailErrors(r);
      syncReady();
    });
  });

  /* ---- tracks ---- */
  function trackRowHtml(t) {
    return '<div class="pln-track" data-id="' + t.id + '"><button type="button" class="pln-trackhead" role="radio" aria-checked="false" aria-expanded="false">' +
      '<span class="pln-radio" aria-hidden="true"></span><span class="pln-namecol"><span class="pln-trackname">' + esc(t.labelHe.length <= 8 ? t.labelHe.replace(/ /g, "\u00a0") : t.labelHe) + "</span>" +
      (t.risk ? '<span class="pln-risk r-' + t.risk + '"><span class="pln-sig" aria-hidden="true"><i></i><i></i><i></i></span>' + esc(S["plan.risk." + t.risk]) + "</span>" : "") + "</span>" +
      '<span class="pln-side"><span class="pln-amt"><bdi class="pln-amtnum"></bdi><small>' + esc(S["plan.perMonth"]) + '</small></span></span></button>' +
      '<div class="pln-bartrack"><i aria-hidden="true"></i><span class="pln-barlbl"></span></div>' +
      '<div class="pln-panel" hidden><div class="pln-eq">' +
      Field({ id: "pln-ret-" + t.id, label: S["plan.track.returnShort"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" max="100" step="any"' }) +
      '<span class="pln-op" aria-hidden="true">\u2212</span>' +
      Field({ id: "pln-fee-" + t.id, label: S["plan.track.feeShort"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" max="10" step="any"' }) +
      '<span class="pln-op" aria-hidden="true">=</span><span class="pln-netchip" aria-live="polite"></span></div>' +
      '<div class="pln-net" hidden></div>' +
      '<div class="pln-eqfoot" hidden><span class="pln-delta"></span><button type="button" class="pln-link pln-reset">' + esc(S["plan.track.reset"]) + "</button></div>" +
      '<div class="pln-local">' + esc(S["plan.track.local"]) + "</div></div></div>";
  }
  function buildTracks() {
    $("#pln-tracks").innerHTML = TRACKS.map(trackRowHtml).join("");
    TRACKS.forEach(function (t) {
      var d = t.defaultReturnPct;
      $("#pln-ret-" + t.id).value = d === null ? "" : d; $("#pln-fee-" + t.id).value = t.defaultFeePct;
    });
    tracksBuilt = true;
  }
  function recompute() {
    rows = planRows(st.T, st.P, st.months, st.edits);
    return rows;
  }
  function paintTracks() {
    recompute();
    /* Colour is relative within the list: the cheapest track is greenest, the most expensive is reddest. */
    var ds = rows.filter(function (r) { return r.deposit !== null; }).map(function (r) { return r.deposit; });
    var lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds);
    rows.forEach(function (r) {
      var el = $('.pln-track[data-id="' + r.id + '"]'), sel = r.id === st.trackId, open = r.id === st.openId;
      el.classList.toggle("sel", sel); el.classList.toggle("open", open);
      var head = el.querySelector(".pln-trackhead");
      head.setAttribute("aria-checked", String(sel)); head.setAttribute("aria-expanded", String(open));
      el.querySelector(".pln-panel").hidden = !open;
      el.querySelector(".pln-amtnum").textContent = r.deposit === null ? S["plan.none"] : r.status === "achieved" ? S["plan.achieved"] : money(r.deposit);
      var fillEl = el.querySelector(".pln-bartrack i"), col = heat(hi > lo && r.deposit !== null ? (r.deposit - lo) / (hi - lo) * 100 : 0), amtEl = el.querySelector(".pln-amt");
      fillEl.style.width = r.deposit === null ? "0%" : Math.max(r.deposit > 0 ? 3 : 0, r.barPct) + "%";
      fillEl.style.background = r.deposit === null ? "" : col; amtEl.style.color = r.deposit === null ? "" : col;
      /* The net return rides on the bar: at the start of the fill when it is long enough, otherwise just past its end. */
      var lbl = el.querySelector(".pln-barlbl"), w = r.deposit === null ? 0 : Math.max(r.deposit > 0 ? 3 : 0, r.barPct), inside = w >= 38;
      lbl.hidden = r.net === null || r.deposit === null;
      lbl.textContent = (r.edited ? "✎ " : "") + (r.net === null ? "" : fill(S["plan.netTag"], { pct: String(r.net) }));
      lbl.classList.toggle("in", inside);
      /* inside the fill the label sits at the start (right in Hebrew); only a very short bar puts it just past the fill's end */
      lbl.style.insetInlineStart = inside ? "10px" : "calc(" + w + "% + 8px)";
      lbl.style.insetInlineEnd = "auto";
      var net = el.querySelector(".pln-net"), delta = el.querySelector(".pln-delta"), reset = el.querySelector(".pln-reset");
      var retEmpty = $("#pln-ret-" + r.id).value === "";
      net.hidden = r.net !== null; net.textContent = r.net === null ? (retEmpty ? S["plan.track.needReturn"] : S["plan.track.badValues"]) : "";
      el.querySelector(".pln-netchip").textContent = r.net === null ? "\u2014" : fill(S["plan.netTag"], { pct: String(r.net) });
      var diff = r.deposit !== null && r.defaultDeposit !== null ? r.deposit - r.defaultDeposit : 0;
      delta.textContent = r.edited && diff !== 0 ? fill(S[diff > 0 ? "plan.track.delta.up" : "plan.track.delta.down"], { amt: money(Math.abs(diff)) }) : "";
      delta.className = "pln-delta" + (diff > 0 ? " up" : diff < 0 ? " down" : "");
      reset.hidden = !r.edited; el.querySelector(".pln-eqfoot").hidden = !r.edited;
      setFieldError(root, "pln-ret-" + r.id, "" ); setFieldError(root, "pln-fee-" + r.id, "");
    });
    var cur = rows.find(function (r) { return r.id === st.trackId; });
    /* How much the starting amount saves per month, shown for the selected track. */
    var chip = $("#pln-initialchip");
    if (st.P > 0 && cur && cur.net !== null) {
      var zero = requiredDeposit(st.T, 0, cur.net, st.months), now = requiredDeposit(st.T, st.P, cur.net, st.months), save = zero.deposit - now.deposit;
      chip.hidden = !(save > 0); chip.textContent = save > 0 ? fill(S["plan.initial.saves"], { amt: money(save) }) : "";
    } else chip.hidden = true;
    paintSummary(cur);
  }
  /* Summary of the chosen track: the monthly deposit, how long it takes and what the money is made of. */
  function paintSummary(cur) {
    var box = $("#pln-summary");
    if (!cur || cur.deposit === null || cur.net === null) { box.hidden = true; plan = null; return; }
    plan = cur; box.hidden = false;
    $("#pln-track-err").textContent = "";
    var t = TRACKS.find(function (x) { return x.id === cur.id; });
    var dep = cur.deposit, end = parseISODate(st.dateISO);
    $("#pln-heroamt").textContent = money(dep);
    $("#pln-herosub").textContent = cur.status === "achieved" ? S["plan.s3.achieved"] : t.labelHe + " \u00b7 " + fill(S["plan.track.net"], { pct: String(cur.net) });
    $("#pln-startlbl").textContent = mmYYYY(today); $("#pln-endlbl").textContent = fill(S["plan.s3.until"], { date: mmYYYY(end) });
    $("#pln-dur").textContent = fill(S["plan.s3.months"], { dur: durText(st.months) });
    var fin = Math.max(st.T, balanceAfter(st.P, dep, cur.net, st.months)), dsum = dep * st.months, ret = Math.max(0, fin - st.P - dsum);
    var parts = [["initial", st.P, S["plan.s3.initial"]], ["deposits", dsum, S["plan.s3.deposits"]], ["returns", ret, S["plan.s3.returns"]]].filter(function (p) { return p[1] > 0; });
    $("#pln-comp").innerHTML = parts.map(function (p) { return '<i class="c-' + p[0] + '" style="width:' + (p[1] / fin * 100).toFixed(2) + '%"></i>'; }).join("");
    $("#pln-legend").innerHTML = parts.map(function (p) { return '<span><b class="c-' + p[0] + '"></b>' + esc(p[2]) + " <bdi>" + esc(money(p[1])) + "</bdi></span>"; }).join("");
  }

  $("#pln-initial").addEventListener("input", function () {
    dirty = true; fmtInput(this);
    var v = this.value === "" ? 0 : numOrNaN(this.value);
    st.P = v >= 0 && Number.isFinite(v) ? v : 0;
    setFieldError(root, "pln-initial", v >= 0 && Number.isFinite(v) ? "" : S["error.positiveNumber"]);
    if (ready) paintTracks();
  });
  $("#pln-tracks").addEventListener("click", function (ev) {
    var reset = ev.target.closest(".pln-reset"), row = ev.target.closest(".pln-track");
    if (!row) return;
    var id = row.dataset.id;
    if (reset) {
      var t = TRACKS.find(function (x) { return x.id === id; });
      delete st.edits[id];
      $("#pln-ret-" + id).value = t.defaultReturnPct === null ? "" : t.defaultReturnPct; $("#pln-fee-" + id).value = t.defaultFeePct;
      paintTracks(); return;
    }
    if (ev.target.closest(".pln-trackhead")) {
      /* Pressing a row selects it and opens it (the previous one closes); pressing the open row only closes it. */
      if (st.openId === id) st.openId = null; else { st.openId = id; st.trackId = id; dirty = true; }
      paintTracks();
    }
  });
  $("#pln-tracks").addEventListener("input", function (ev) {
    var m = /^pln-(ret|fee)-(.+)$/.exec(ev.target.id || "");
    if (!m) return;
    dirty = true;
    var id = m[2], e = st.edits[id] || (st.edits[id] = {});
    var val = ev.target.value;
    if (m[1] === "ret") e.ret = val === "" ? null : Number(val); else e.fee = val === "" ? "" : Number(val);
    var t = TRACKS.find(function (x) { return x.id === id; });
    /* Back to the default values is not an edit. */
    var sameRet = ("ret" in e) ? e.ret === t.defaultReturnPct : true, sameFee = ("fee" in e) ? (e.fee === "" ? 0 : e.fee) === t.defaultFeePct : true;
    if (sameRet && sameFee) delete st.edits[id];
    paintTracks();
    var r = rows.find(function (x) { return x.id === id; });
    if (r && r.net === null && val !== "") setFieldError(root, "pln-" + m[1] + "-" + id, m[1] === "ret" ? S["error.returnRange"] : S["error.feeRange"]);
  });

  /* ---- save ---- */
  $("#pln-save").addEventListener("click", function () {
    if (saved) return;
    var r = readDetails(); showDetailErrors(r);
    var first = ["name", "target", "date"].find(function (k) { return r.errs[k]; });
    if (first) { $("#pln-" + first).focus(); return; }
    if (!plan || plan.deposit === null) {
      $("#pln-track-err").textContent = S["plan.err.track"];
      $("#pln-tracks").scrollIntoView({ block: "center" });
      return;
    }
    var icon = picker.get(), diff = sharing ? diffMembers(sharing.getSaved(), sharing.getDraft()) : null;
    var res = o.onSave({
      id: uid(), name: r.name, emoji: icon.emoji, image: icon.image, targetAmount: st.T, initialAmount: st.P, monthlyDeposit: plan.deposit,
      isPublic: sharing ? sharing.isPublic() : false, trackId: plan.id, annualReturnPct: plan.gross, managementFeePct: plan.fee, startDate: toISODate(today), createdAt: new Date().toISOString()
    }, diff && hasChanges(diff) ? diff : null);
    if (res && typeof res.then === "function") {
      var btn = $("#pln-save"); btn.disabled = true; sharing.setError("");
      res.then(function () { saved = true; realClose(); }, function () { btn.disabled = false; sharing.setError(S["share.error.saveFailed"]); });
      return;
    }
    saved = true; realClose();
  });

  /* ---- navigation ---- */
  $("#pln-close").addEventListener("click", function () { modal.close(); });
  $("#pln-cancel").addEventListener("click", function () { modal.close(); });
  root.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && ev.target.tagName === "INPUT" && !ev.target.closest(".sharing")) ev.preventDefault(); });

  function reset() {
    dirty = false; saved = false; today = todayDate();
    st = { T: NaN, months: 0, dateISO: "", P: 0, trackId: null, openId: null, edits: {} }; plan = null; ready = false;
    ["#pln-name", "#pln-target", "#pln-date", "#pln-initial"].forEach(function (x) { $(x).value = ""; });
    $("#pln-date").min = toISODate(addMonths(today, 1)); $("#pln-date").max = toISODate(addMonths(today, MAX_MONTHS));
    picker.set({}); hero.setImage(picker.get().image);
    showDetailErrors({ errs: {} }); setFieldError(root, "pln-initial", ""); $("#pln-track-err").textContent = "";
    $("#pln-save").disabled = false;
    tracksBuilt = false; $("#pln-tracks").innerHTML = "";
    if (sharing) { sharing.set([], true, false, null); sharing.setError(""); }
    syncReady();
  }
  return {
    open: function (openerEl) { reset(); modal.open(openerEl, "#pln-name"); },
    isOpen: function () { return modal.isOpen(); },
    destroy: function () { leave.destroy(); modal.destroy(); }
  };
}
