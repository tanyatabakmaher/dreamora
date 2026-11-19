import { fromHTML } from "../lib/dom.js";
import { createModal } from "./ui/Modal.js";
import { Button } from "./ui/Button.js";
/* Yes/no dialog: a bottom sheet on phones, centered from 640px. ask(openerEl, texts?) resolves true on "yes", false on anything else (no, Escape, backdrop). */
export function createConfirm(o) {
  var sheet = fromHTML('<div class="sheet confirm" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-body">' +
    '<h2 id="cf-title"></h2><p id="cf-body"></p><div class="actions">' +
    Button({ id: "cf-yes", variant: "solid-danger", label: o.yes, grow: true }) + Button({ id: "cf-no", variant: "ghost", label: o.no }) + "</div></div>");
  sheet.querySelector("#cf-title").textContent = o.title;
  sheet.querySelector("#cf-body").textContent = o.body;
  var resolve = null;
  function settle(v) { if (resolve) { var r = resolve; resolve = null; r(v); } }
  var modal = createModal({ sheet: sheet, onClose: function () { settle(false); } });
  sheet.querySelector("#cf-yes").addEventListener("click", function () { settle(true); modal.close(); });
  sheet.querySelector("#cf-no").addEventListener("click", function () { modal.close(); });
  return {
    /* texts (optional): { title, body, yes } replaces the default wording for this one question */
    ask: function (openerEl, texts) {
      var t = texts || {};
      sheet.querySelector("#cf-title").textContent = t.title || o.title;
      sheet.querySelector("#cf-body").textContent = t.body || o.body;
      sheet.querySelector("#cf-yes").textContent = t.yes || o.yes;
      modal.el.classList.toggle("center", window.matchMedia("(min-width: 640px)").matches);
      return new Promise(function (res) { resolve = res; modal.open(openerEl, "#cf-no"); });
    },
    destroy: function () { modal.destroy(); }
  };
}
