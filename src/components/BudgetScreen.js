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

/* Ring: the saved share of the income. */
function ring(pct) {
  var size = 200, sw = 24, r = (size - sw) / 2, c = 2 * Math.PI * r, a = c * Math.max(0, Math.min(100, pct)) / 100;
  return '<svg class="bd-ring" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true"><circle class="bd-ring-track" cx="100" cy="100" r="' + r + '" fill="none" stroke-width="' + sw + '"/>' +
    '<circle class="bd-ring-arc" cx="100" cy="100" r="' + r + '" fill="none" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + a.toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 100 100)"/></svg>';
}
function amountField(id, icon, label, cls) {
  return '<label class="bd-chip ' + (cls || "") + '" for="' + id + '"><span class="bd-chip-top"><span>' + icon + " " + esc(label) + "</span>" + PencilIcon() + "</span>" +
    '<span class="bd-chip-val"><span aria-hidden="true">₪</span><input class="bd-in num" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" dir="ltr" placeholder="0"></span></label>';
}

export function createBudgetScreen(o) {
  var el = fromHTML('<div class="bd-page"><div class="appbar"><div class="appbar-in">' +
    '<div class="appbar-start"><div class="appbar-brand">' + HeaderLogo({ height: 40 }) + "</div></div>" +
    '<div class="appbar-end"><button type="button" class="linkbtn" id="bd-back">' + esc(S["bd.back"]) + "</button></div></div></div>" +
    '<div class="wrap bd-wrap"><div class="titlebar bd-titlebar"><div><h1 id="bd-title" tabindex="-1">' + esc(S["bd.title"]) + '</h1><p class="bd-sub">' + esc(S["bd.subtitle"]) + "</p></div></div>" +
    '<div class="bd-grid"><section class="bd-hero"><div class="bd-hero-in">' +
    amountField("bd-pool", "🫙", S["bd.pool"], "bd-pool") +
    '<div class="bd-donut" aria-live="polite"><div id="bd-ring"></div><div class="bd-donut-text" id="bd-donut-text"></div></div>' +
    '<div class="bd-two">' + amountField("bd-income", "💼", S["bd.income"]) + amountField("bd-expenses", "🧾", S["bd.expenses"]) + "</div>" +
    Button({ id: "bd-save", label: S["bd.save"], block: true }) +
    '</div></section><section class="bd-result" aria-live="polite"><div id="bd-sum"></div><div id="bd-notice"></div></section></div></div></div>');
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
      h += '<ul class="bd-goals">' + s.goals.map(function (g) {
        return "<li><span>" + esc((g.emoji ? g.emoji + " " : "") + g.name) + '</span><b class="num">' + esc(fill(S["bd.goal.line"], { amount: money(g.monthlyDeposit || 0) })) + "</b>" +
          (s.status === "over" ? '<em class="bd-flag">' + esc(S["bd.goal.over"]) + "</em>" : "") + "</li>";
      }).join("") + "</ul>";
      h += "<p>" + esc(s.status === "fits" ? S["bd.sum.fits"] : fill(S["bd.sum.over"], { required: money(s.required), saving: money(s.saving), gap: money(s.gap) })) + "</p>";
      if (s.status === "over") {
        h += '<div class="bd-actions">' + Button({ id: "bd-arrange", label: arranging ? S["bd.fix.close"] : S["bd.fix.arrange"] }) + "</div>";
        if (arranging) {
          var plan = stretchPlan(goals, b.saving, today);
          h += '<div class="bd-arrange"><h3>' + esc(fill(S["bd.arrange.title"], { saving: money(b.saving) })) + "</h3><ul>" + plan.map(function (r) {
            var line = r.newDate ? fill(S["bd.arrange.row"], { goal: r.name, from: r.oldDate ? fmtDate(r.oldDate) : "-", to: fmtDate(r.newDate) }) : fill(S["bd.arrange.never"], { goal: r.name });
            return "<li>" + esc(line) + "</li>";
          }).join("") + '</ul><p class="bd-tip">' + esc(S["bd.arrange.tip"]) + "</p></div>";
        }
      }
      if (s.poolShort > 0) h += '<p class="bd-warn">' + esc(fill(S["bd.pool.short"], { amount: money(s.allocated) })) + "</p>";
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
