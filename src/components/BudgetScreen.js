import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { money, fmtDate, todayDate, fmtAmountInput, parseAmount } from "../lib/format.js";
import { summarize, investedEstimate, stretchPlan } from "../lib/budget.js";
import { Button } from "./ui/Button.js";
import { Field } from "./ui/Field.js";
import { HeaderLogo } from "./ui/Logo.js";
import { showToast } from "./ui/Toast.js";

/* "התקציב שלי": a full page (not a dialog) opened from the settings menu. One screen: the pool, income, expenses and planned monthly saving, with a live check against the goals.
   o.repo = goals storage, o.budgetRepo = budget storage, o.onBack(). */
function fill(t, vars) { return Object.keys(vars).reduce(function (s, k) { return s.split("{" + k + "}").join(vars[k]); }, t); }
function numOf(el) { var n = Number(parseAmount(el.value)); return isFinite(n) && n > 0 ? n : 0; }

export function createBudgetScreen(o) {
  var amt = 'inputmode="numeric" autocomplete="off" dir="ltr"';
  var el = fromHTML('<div class="bd-page"><div class="appbar"><div class="appbar-in">' +
    '<div class="appbar-start"><div class="appbar-brand">' + HeaderLogo({ height: 40 }) + "</div></div>" +
    '<div class="appbar-end"><button type="button" class="linkbtn" id="bd-back">' + esc(S["bd.back"]) + "</button></div></div></div>" +
    '<div class="wrap bd-wrap"><div class="titlebar bd-titlebar"><div><h1 id="bd-title" tabindex="-1">' + esc(S["bd.title"]) + '</h1><p class="bd-sub">' + esc(S["bd.subtitle"]) + "</p></div></div>" +
    '<div class="bd-grid"><section class="bd-form">' +
    Field({ id: "bd-pool", label: S["bd.pool"], hint: S["bd.pool.hint"], num: true, type: "text", attrs: amt }) +
    Field({ id: "bd-income", label: S["bd.income"], num: true, type: "text", attrs: amt }) +
    Field({ id: "bd-expenses", label: S["bd.expenses"], num: true, type: "text", attrs: amt }) +
    '<div class="bd-free" id="bd-free" aria-live="polite"></div>' +
    Field({ id: "bd-saving", label: S["bd.saving"], hint: S["bd.saving.hint"], num: true, type: "text", attrs: amt }) +
    Button({ id: "bd-save", label: S["bd.save"], block: true }) +
    '</section><section class="bd-result" aria-live="polite"><div id="bd-bar"></div><div id="bd-sum"></div><div id="bd-notice"></div></section></div></div></div>');
  var q = function (s) { return el.querySelector(s); };
  var goals = [], pool = q("#bd-pool"), income = q("#bd-income"), expenses = q("#bd-expenses"), saving = q("#bd-saving"), arranging = false, destroyed = false;
  var inputs = [pool, income, expenses, saving];

  function values() { return { pool: numOf(pool), income: numOf(income), expenses: numOf(expenses), saving: numOf(saving) }; }

  function render() {
    var b = values(), today = todayDate(), s = summarize(b, goals, today);
    q("#bd-free").textContent = fill(S["bd.free"], { amount: money(Math.max(s.free, 0)) });
    q("#bd-free").classList.toggle("neg", s.free < 0);
    q("#bd-saving-hint").textContent = fill(S["bd.saving.hint"], { amount: money(Math.max(s.free, 0)) });
    var err = q("#bd-saving-err"); err.textContent = s.savingTooHigh && b.saving > 0 ? S["bd.saving.tooHigh"] : "";
    q("#bd-saving-field").classList.toggle("invalid", !!err.textContent);
    /* bar: expenses / saving / the rest of the income */
    var inc = b.income, ex = inc > 0 ? Math.min(100, b.expenses / inc * 100) : 0, sv = inc > 0 ? Math.min(100 - ex, b.saving / inc * 100) : 0;
    q("#bd-bar").innerHTML = inc > 0 ?
      '<div class="bd-bar" role="img" aria-label="' + esc(S["bd.legend.expenses"] + " " + Math.round(ex) + "%, " + S["bd.legend.saving"] + " " + Math.round(sv) + "%") + '">' +
      '<span class="bd-seg ex" style="width:' + ex.toFixed(1) + '%"></span><span class="bd-seg sv" style="width:' + sv.toFixed(1) + '%"></span></div>' +
      '<div class="bd-legend"><span><i class="ex"></i>' + esc(S["bd.legend.expenses"]) + '</span><span><i class="sv"></i>' + esc(S["bd.legend.saving"]) + '</span><span><i class="fr"></i>' + esc(S["bd.legend.free"]) + "</span></div>" : "";
    /* summary against the goals */
    var h = '<div class="card-lite bd-sum ' + s.status + '"><h2>' + esc(S["bd.sum.title"]) + "</h2>";
    if (s.status === "empty") h += "<p>" + esc(S["bd.sum.none"]) + "</p>";
    else {
      h += '<ul class="bd-goals">' + s.goals.map(function (g) {
        return "<li><span>" + esc((g.emoji ? g.emoji + " " : "") + g.name) + '</span><b class="num">' + esc(fill(S["bd.goal.line"], { amount: money(g.monthlyDeposit || 0) })) + "</b>" +
          (s.status === "over" ? '<em class="bd-flag">' + esc(S["bd.goal.over"]) + "</em>" : "") + "</li>";
      }).join("") + "</ul>";
      h += "<p>" + esc(s.status === "fits" ? S["bd.sum.fits"] : fill(S["bd.sum.over"], { required: money(s.required), saving: money(s.saving), gap: money(s.gap) })) + "</p>";
      if (s.status === "over") {
        h += '<div class="bd-actions">' + (s.raiseTo !== null ? Button({ id: "bd-raise", label: fill(S["bd.fix.raise"], { amount: money(s.raiseTo) }) }) : "") +
          Button({ id: "bd-arrange", variant: "ghost", label: arranging ? S["bd.fix.close"] : S["bd.fix.arrange"] }) + "</div>";
        if (arranging) {
          var plan = stretchPlan(goals, b.saving, today);
          h += '<div class="bd-arrange"><h3>' + esc(fill(S["bd.arrange.title"], { saving: money(b.saving) })) + "</h3><ul>" + plan.map(function (r) {
            var line = r.newDate ? fill(S["bd.arrange.row"], { goal: r.name, from: r.oldDate ? fmtDate(r.oldDate) : "-", to: fmtDate(r.newDate) }) : fill(S["bd.arrange.never"], { goal: r.name });
            return "<li>" + esc(line) + "</li>";
          }).join("") + "</ul><p class=\"bd-tip\">" + esc(S["bd.arrange.tip"]) + "</p></div>";
        }
      }
      if (s.poolShort > 0) h += '<p class="bd-warn">' + esc(fill(S["bd.pool.short"], { amount: money(s.allocated) })) + "</p>";
    }
    q("#bd-sum").innerHTML = h + "</div>";
    var rb = q("#bd-raise"); if (rb) rb.addEventListener("click", function () { saving.value = fmtAmountInput(s.raiseTo); render(); });
    var ab = q("#bd-arrange"); if (ab) ab.addEventListener("click", function () { arranging = !arranging; render(); });
    /* unallocated money: no return, with a rough "if invested" estimate */
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
    if (b) inputs.forEach(function (i, k) { var v = [b.pool, b.income, b.expenses, b.saving][k]; i.value = v ? fmtAmountInput(v) : ""; });
    render();
  }).catch(function () { if (!destroyed) showToast(S["bd.loadFailed"]); });
  setTimeout(function () { var t = q("#bd-title"); if (t) t.focus(); }, 0);
  return { el: el, destroy: function () { destroyed = true; el.remove(); } };
}
