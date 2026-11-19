import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { Button, IconButton } from "./ui/Button.js";
import { createModal } from "./ui/Modal.js";
import { showToast } from "./ui/Toast.js";
import { createBudgetForm } from "./BudgetForm.js";

/* Shown once after sign-in to anyone who has no budget yet: the same three numbers as the full page, in a sheet that opens like "add goal".
   No goals are shown here (a new user has none). o.budgetRepo = budget storage, o.onDone() after save or skip. */
export function createBudgetDialog(o) {
  var sheet = fromHTML('<div class="sheet bd-dialog" role="dialog" aria-modal="true" aria-labelledby="bdd-title">' +
    '<div class="sheet-head"><h2 id="bdd-title">' + esc(S["bd.title"]) + "</h2>" + IconButton({ id: "bdd-close", label: S["form.close"], glyph: "✕" }) + "</div>" +
    '<p class="bd-sub">' + esc(S["bd.subtitle"]) + "</p>" +
    '<section class="bd-hero"><div class="bd-hero-in">' +
    '<div id="bdd-form"></div>' +
    Button({ id: "bdd-save", label: S["bd.save"], block: true }) + "</div></section>" +
    '<div class="bdd-skip">' + Button({ id: "bdd-skip", variant: "ghost", label: S["bd.skip"], block: true }) + "</div></div>");
  var modal = createModal({ sheet: sheet });
  var q = function (s) { return sheet.querySelector(s); };
  var form = createBudgetForm({ uid: "bdd", onChange: function () { form.paint(null); } });
  q("#bdd-form").appendChild(form.el);
  function values() { return form.values(); }
  function finish() { modal.close(); modal.destroy(); o.onDone(); }
  q("#bdd-close").addEventListener("click", finish);
  q("#bdd-skip").addEventListener("click", finish);
  q("#bdd-save").addEventListener("click", function () {
    var btn = q("#bdd-save"); btn.disabled = true;
    o.budgetRepo.save(values()).then(function () { showToast(S["bd.saved"], "success"); finish(); })
      .catch(function () { showToast(S["bd.saveFailed"]); btn.disabled = false; });
  });
  form.paint(null);
  return { open: function () { modal.open(null, "#bdd-pool"); }, destroy: function () { modal.destroy(); } };
}
