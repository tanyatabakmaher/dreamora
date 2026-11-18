import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { money, fmtAmountInput } from "../lib/format.js";
import { Button, IconButton } from "./ui/Button.js";
import { createModal } from "./ui/Modal.js";
import { showToast } from "./ui/Toast.js";
import { ring, amountField, numOf, fill } from "./BudgetScreen.js";

/* Shown once after sign-in to anyone who has no budget yet: the same three numbers as the full page, in a sheet that opens like "add goal".
   No goals are shown here (a new user has none). o.budgetRepo = budget storage, o.onDone() after save or skip. */
export function createBudgetDialog(o) {
  var sheet = fromHTML('<div class="sheet bd-dialog" role="dialog" aria-modal="true" aria-labelledby="bdd-title">' +
    '<div class="sheet-head"><h2 id="bdd-title">' + esc(S["bd.title"]) + "</h2>" + IconButton({ id: "bdd-close", label: S["form.close"], glyph: "✕" }) + "</div>" +
    '<p class="bd-sub">' + esc(S["bd.subtitle"]) + "</p>" +
    '<section class="bd-hero"><div class="bd-hero-in">' +
    '<div class="bd-donut" aria-live="polite"><div id="bdd-ring"></div><div class="bd-donut-disc"></div><div class="bd-donut-text" id="bdd-text"></div></div>' +
    '<div class="bd-ledger">' + amountField("bd-pool", "🫙", S["bd.pool"], "bd-pool") + amountField("bd-income", "💼", S["bd.income"], "bd-income") + amountField("bd-expenses", "🧾", S["bd.expenses"], "bd-expenses") + "</div>" +
    Button({ id: "bdd-save", label: S["bd.save"], block: true }) + "</div></section>" +
    '<div class="bdd-skip">' + Button({ id: "bdd-skip", variant: "ghost", label: S["bd.skip"], block: true }) + "</div></div>");
  var modal = createModal({ sheet: sheet });
  var q = function (s) { return sheet.querySelector(s); };
  var pool = q("#bd-pool"), income = q("#bd-income"), expenses = q("#bd-expenses");

  function values() { var i = numOf(income), e = numOf(expenses); return { pool: numOf(pool), income: i, expenses: e, saving: Math.max(0, i - e) }; }
  function render() {
    var b = values(), negative = b.income > 0 && b.expenses > b.income, empty = b.income <= 0, rate = b.income > 0 ? b.saving / b.income * 100 : 0;
    q("#bdd-ring").innerHTML = ring(rate);
    q("#bdd-text").innerHTML = empty ? '<span class="bd-donut-hint">' + esc(S["bd.donut.empty"]) + "</span>" :
      '<span class="bd-donut-label">' + esc(S["bd.donut.label"]) + '</span><span class="bd-donut-big num">' + esc(money(b.saving)) + "</span>" +
      '<span class="bd-donut-pct' + (negative ? " neg" : "") + '">' + esc(negative ? S["bd.donut.negative"] : fill(S["bd.donut.pct"], { pct: Math.round(rate) })) + "</span>";
  }
  [pool, income, expenses].forEach(function (i) { i.addEventListener("input", function () { i.value = fmtAmountInput(i.value); render(); }); });
  function finish() { modal.close(); modal.destroy(); o.onDone(); }
  q("#bdd-close").addEventListener("click", finish);
  q("#bdd-skip").addEventListener("click", finish);
  q("#bdd-save").addEventListener("click", function () {
    var btn = q("#bdd-save"); btn.disabled = true;
    o.budgetRepo.save(values()).then(function () { showToast(S["bd.saved"], "success"); finish(); })
      .catch(function () { showToast(S["bd.saveFailed"]); btn.disabled = false; });
  });
  render();
  return { open: function () { modal.open(null, "#bd-pool"); }, destroy: function () { modal.destroy(); } };
}
