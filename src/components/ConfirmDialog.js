import { fromHTML } from "../lib/dom.js";
import { createModal } from "./ui/Modal.js";
import { Button } from "./ui/Button.js";
/* Yes/no dialog. ask(openerEl) resolves true on "yes", false on anything else (no, Escape, backdrop). */
export function createConfirm(o) {
  var sheet = fromHTML('<div class="sheet confirm" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-body">' +
    '<h2 id="cf-title"></h2><p id="cf-body"></p><div class="actions">' +
    Button({ id: "cf-yes", variant: "solid-danger", label: o.yes, grow: true }) + Button({ id: "cf-no", variant: "ghost", label: o.no }) + "</div></div>");
  sheet.querySelector("#cf-title").textContent = o.title;
  sheet.querySelector("#cf-body").textContent = o.body;
  var resolve = null;
  function settle(v) { if (resolve) { var r = resolve; resolve = null; r(v); } }
  var modal = createModal({ sheet: sheet, center: true, onClose: function () { settle(false); } });
  sheet.querySelector("#cf-yes").addEventListener("click", function () { settle(true); modal.close(); });
  sheet.querySelector("#cf-no").addEventListener("click", function () { modal.close(); });
  return {
    ask: function (openerEl) { return new Promise(function (res) { resolve = res; modal.open(openerEl, "#cf-no"); }); },
    destroy: function () { modal.destroy(); }
  };
}
