import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { money, fmtDate, todayDate, fmtAmountInput, parseAmount } from "../lib/format.js";
import { summarize, investedEstimate, stretchPlan } from "../lib/budget.js";
import { Button } from "./ui/Button.js";
import { HeaderLogo } from "./ui/Logo.js";
import { PencilIcon } from "./ui/Icons.js";
import { showToast } from "./ui/Toast.js";

/* "התקציב שלי": a full page (not a dialog) opened from the settings menu.
   The user enters only three numbers: the money they have today, monthly income and monthly expenses. The monthly saving is what is left (income minus expenses) and is checked live against the goals.
   o.repo = goals storage, o.budgetRepo = budget storage, o.onBack(). */
function fill(t, vars) { return Object.keys(vars).reduce(function (s, k) { return s.split("{" + k + "}").join(vars[k]); }, t); }
function numOf(el) { var n = Number(parseAmount(el.value)); return isFinite(n) && n > 0 ? n : 0; }

/* Ring: the saved share of the income, drawn with the brand gradient. */
function ring(pct) {
  var size = 200, sw = 24, r = (size - sw) / 2, c = 2 * Math.PI * r, a = c * Math.max(0, Math.min(100, pct)) / 100;
  return '<svg class="bd-ring" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true"><defs><linearGradient id="bd-grad" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="0" y2="200">' +
    '<stop offset="0" stop-color="var(--aurora-1)"/><stop offset=".5" stop-color="var(--aurora-2)"/><stop offset="1" stop-color="var(--aurora-3)"/></linearGradient></defs>' +
    '<circle class="bd-ring-track" cx="100" cy="100" r="' + r + '" fill="none" stroke-width="' + sw + '"/>' +
    '<circle class="bd-ring-arc" cx="100" cy="100" r="' + r + '" fill="none" stroke="url(#bd-grad)" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + a.toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 100 100)"/></svg>';
}
function pct(got, need) { return need > 0 ? Math.max(0, Math.min(100, got / need * 100)) : 100; }
/* Double ring: the outer ring is the starting amount, the inner ring the monthly deposit. A goal that is fully covered gets two closed rings and a check mark. */
function rings(pi, pm, size, sw, ok) {
  var h = size / 2, r1 = (size - sw) / 2, r2 = r1 - sw - 3, c1 = 2 * Math.PI * r1, c2 = 2 * Math.PI * r2;
  function arc(cls, r, c, p) { return p > 0 ? '<circle class="' + cls + '" cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + (c * Math.min(p, 100) / 100).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 ' + h + " " + h + ')"/>' : ""; }
  return '<svg class="bd-rings" viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(fill(S["bd.ring.aria"], { i: Math.round(pi), d: Math.round(pm) })) + '">' +
    '<circle class="bd-r-track" cx="' + h + '" cy="' + h + '" r="' + r1 + '" fill="none" stroke-width="' + sw + '"/><circle class="bd-r-track" cx="' + h + '" cy="' + h + '" r="' + r2 + '" fill="none" stroke-width="' + sw + '"/>' +
    arc("bd-r-i", r1, c1, pi) + arc("bd-r-d", r2, c2, pm) +
    (ok ? '<text class="bd-r-check" x="' + h + '" y="' + (h + size * 0.08) + '" text-anchor="middle" font-size="' + Math.round(size * 0.24) + '">✓</text>' : "") + "</svg>";
}
/* The goal's own picture as a small polaroid (its emoji when it has no picture). */
function polaroid(g) {
  var pic = g.image ? '<img src="' + esc(g.image) + '" alt="" loading="lazy" decoding="async">' : '<span class="bd-pol-emoji" aria-hidden="true">' + esc(g.emoji || "🎯") + "</span>";
  return '<span class="bd-pol" aria-hidden="true">' + pic + "</span>";
}
function lackLine(r) {
  if (!r.depositShort && !r.initialShort) return '<div class="bd-lack ok">' + esc(S["bd.row.covered"]) + " ✓</div>";
  var t = r.depositShort ? fill(S["bd.row.lack.deposit"], { amount: "<b>" + money(r.need - r.got) + "</b>" }) + (r.initialShort ? " " + fill(S["bd.row.lack.both"], { amount: "<b>" + money(r.initialNeed - r.initialGot) + "</b>" }) : "")
    : fill(S["bd.row.lack.initial"], { amount: "<b>" + money(r.initialNeed - r.initialGot) + "</b>" });
  return '<div class="bd-lack">' + t + "</div>";
}
/* A covered goal lights up; a goal that does not converge fades into the background. */
function rowHtml(r) {
  var ok = !r.depositShort && !r.initialShort;
  return '<li class="bd-row ' + (ok ? "ok" : "dim") + '">' + polaroid(r.goal) + '<div class="bd-goal-main"><div class="bd-goal-name">' + esc(r.goal.name) + "</div>" + lackLine(r) + "</div>" +
    rings(pct(r.initialGot, r.initialNeed), pct(r.got, r.need), 64, 7, ok) + "</li>";
}
function totalCard(al) {
  var ok = al.depositGot >= al.depositNeed && al.initialGot >= al.initialNeed;
  return '<div class="bd-total">' + rings(pct(al.initialGot, al.initialNeed), pct(al.depositGot, al.depositNeed), 104, 11, ok) + '<div class="bd-total-text"><b>' + esc(S["bd.all"]) + "</b>" +
    "<span><i class=\"d-i\"></i>" + esc(fill(S["bd.total.initial"], { got: money(al.initialGot), need: money(al.initialNeed) })) + "</span>" +
    "<span><i class=\"d-d\"></i>" + esc(fill(S["bd.total.deposit"], { got: money(al.depositGot), need: money(al.depositNeed) })) + "</span></div></div>";
}
function amountField(id, icon, label, cls) {
  return '<label class="bd-row-in ' + (cls || "") + '" for="' + id + '"><span class="bd-row-ic" aria-hidden="true">' + icon + '</span><span class="bd-row-label">' + esc(label) + "</span>" +
    '<span class="bd-row-val"><span aria-hidden="true">₪</span><input class="bd-in num" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" dir="ltr" placeholder="0"></span>' + PencilIcon() + "</label>";
}

export function createBudgetScreen(o) {
  var el = fromHTML('<div class="bd-page"><div class="appbar"><div class="appbar-in">' +
    '<div class="appbar-start"><div class="appbar-brand">' + HeaderLogo({ height: 40 }) + "</div></div>" +
    '<div class="appbar-end"><button type="button" class="linkbtn" id="bd-back">' + esc(S["bd.back"]) + "</button></div></div></div>" +
    '<div class="wrap bd-wrap"><div class="titlebar bd-titlebar"><div><h1 id="bd-title" tabindex="-1">' + esc(S["bd.title"]) + '</h1><p class="bd-sub">' + esc(S["bd.subtitle"]) + "</p></div></div>" +
    '<div class="bd-grid"><section class="bd-hero"><div class="bd-hero-in">' +
    '<div class="bd-donut" aria-live="polite"><div id="bd-ring"></div><div class="bd-donut-disc"></div><div class="bd-donut-text" id="bd-donut-text"></div></div>' +
    '<div class="bd-ledger">' + amountField("bd-pool", "🫙", S["bd.pool"], "bd-pool") + amountField("bd-income", "💼", S["bd.income"], "bd-income") + amountField("bd-expenses", "🧾", S["bd.expenses"], "bd-expenses") + "</div>" +
    Button({ id: "bd-save", label: S["bd.save"], block: true }) +
    '</div></section><section class="bd-result" aria-live="polite"><div class="bd-result-in"><div id="bd-sum"></div><div id="bd-notice"></div></div></section></div></div></div>');
  var q = function (s) { return el.querySelector(s); };
  var goals = [], pool = q("#bd-pool"), income = q("#bd-income"), expenses = q("#bd-expenses"), arranging = false, destroyed = false;
  var inputs = [pool, income, expenses];

  function values() {
    var i = numOf(income), e = numOf(expenses);
    return { pool: numOf(pool), income: i, expenses: e, saving: Math.max(0, i - e) };
  }

  function render() {
    var b = values(), today = todayDate(), s = summarize(b, goals, today);
    var negative = b.income > 0 && b.expenses > b.income, empty = b.income <= 0;
    q("#bd-ring").innerHTML = ring(s.savingRatePct || 0);
    q("#bd-donut-text").innerHTML = empty ? '<span class="bd-donut-hint">' + esc(S["bd.donut.empty"]) + "</span>" :
      '<span class="bd-donut-label">' + esc(S["bd.donut.label"]) + '</span><span class="bd-donut-big num">' + esc(money(b.saving)) + "</span>" +
      '<span class="bd-donut-pct' + (negative ? " neg" : "") + '">' + esc(negative ? S["bd.donut.negative"] : fill(S["bd.donut.pct"], { pct: Math.round(s.savingRatePct || 0) })) + "</span>";
    var h = '<div class="card-lite bd-sum ' + s.status + '"><h2>' + esc(S["bd.sum.title"]) + "</h2>";
    if (s.status === "empty") h += "<p>" + esc(S["bd.sum.none"]) + "</p>";
    else {
      var al = s.alloc;
      h += totalCard(al) + '<ul class="bd-goals">' + al.rows.map(rowHtml).join("") + "</ul>";
      h += '<div class="bd-foot">';
      h += "<p>" + esc(s.status === "fits" ? S["bd.sum.fits"] : s.gap > 0 ? fill(S["bd.sum.over"], { required: money(s.required), saving: money(s.saving), gap: money(s.gap) }) :
        fill(S["bd.sum.overInitial"], { need: money(s.allocated), pool: money(b.pool), gap: money(s.poolShort) })) + "</p>";
      if (s.status === "over") h += '<p class="bd-tip">' + esc(S["bd.row.order"]) + "</p>";
      if (s.gap > 0) {
        h += '<div class="bd-actions">' + Button({ id: "bd-arrange", label: arranging ? S["bd.fix.close"] : S["bd.fix.arrange"] }) + "</div>";
        if (arranging) {
          var plan = stretchPlan(goals, b.saving, today);
          h += '<div class="bd-arrange"><h3>' + esc(fill(S["bd.arrange.title"], { saving: money(b.saving) })) + "</h3><ul>" + plan.map(function (r) {
            var line = r.newDate ? fill(S["bd.arrange.row"], { goal: r.name, from: r.oldDate ? fmtDate(r.oldDate) : "-", to: fmtDate(r.newDate) }) : fill(S["bd.arrange.never"], { goal: r.name });
            return "<li>" + esc(line) + "</li>";
          }).join("") + '</ul><p class="bd-tip">' + esc(S["bd.arrange.tip"]) + "</p></div>";
        }
      }
      h += "</div>";
    }
    q("#bd-sum").innerHTML = h + "</div>";
    var ab = q("#bd-arrange"); if (ab) ab.addEventListener("click", function () { arranging = !arranging; render(); });
    var n = q("#bd-notice");
    if (s.unallocated > 0) {
      var e = investedEstimate(s.unallocated);
      n.innerHTML = '<div class="bd-notice"><b>' + esc(S["bd.notice.title"]) + "</b><p>" + esc(fill(S["bd.notice.text"], { amount: money(s.unallocated), gain: money(e.perYear), pct: e.netPct })) + "</p></div>";
    } else n.innerHTML = "";
  }

  inputs.forEach(function (i) { i.addEventListener("input", function () { i.value = fmtAmountInput(i.value); render(); }); });
  q("#bd-back").addEventListener("click", function () { o.onBack(); });
  q("#bd-save").addEventListener("click", function () {
    var btn = q("#bd-save"); btn.disabled = true;
    o.budgetRepo.save(values()).then(function () { showToast(S["bd.saved"], "success"); })
      .catch(function () { showToast(S["bd.saveFailed"]); }).then(function () { btn.disabled = false; });
  });

  render();
  Promise.all([o.budgetRepo.load(), o.repo.load()]).then(function (r) {
    if (destroyed) return;
    var b = r[0]; goals = r[1] || [];
    if (b) { pool.value = b.pool ? fmtAmountInput(b.pool) : ""; income.value = b.income ? fmtAmountInput(b.income) : ""; expenses.value = b.expenses ? fmtAmountInput(b.expenses) : ""; }
    render();
  }).catch(function () { if (!destroyed) showToast(S["bd.loadFailed"]); });
  setTimeout(function () { var t = q("#bd-title"); if (t) t.focus(); }, 0);
  return { el: el, destroy: function () { destroyed = true; el.remove(); } };
}
