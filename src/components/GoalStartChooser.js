import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { IconButton } from "./ui/Button.js";
import { createModal } from "./ui/Modal.js";

/* The first step of "add goal": a bottom sheet (a centered dialog on wide screens) with two ways to start.
   "known deposit" (I know how much to deposit, show me when I arrive) goes on to the existing goal form via onKnownDeposit(openerEl, presetMode).
   "known date" (I know when I want to arrive, show me how much to deposit) goes on to the plan flow via onKnownDate(openerEl). */
var PICTURES = { date: "pics/icons/goal-1.webp", deposit: "pics/icons/goal-10.webp" };

function Choice(o) {
  return '<button type="button" class="choice" id="' + o.id + '">' +
    '<span class="pola ' + o.tilt + '" aria-hidden="true"><img src="' + o.src + '" alt="" width="64" height="64" decoding="async" draggable="false"></span>' +
    '<span class="choice-text"><span class="choice-title">' + esc(o.title) + '</span><span class="choice-sub">' + esc(o.sub) + "</span>" +
    '<span class="choice-ex ' + o.tone + '"><bdi>' + esc(o.exA) + "</bdi> ← <bdi>" + esc(o.exB) + "</bdi></span></span></button>";
}

export function createGoalStartChooser(o) {
  var sheet = fromHTML('<div class="sheet chooser" role="dialog" aria-modal="true" aria-labelledby="gc-title">' +
    '<div class="chooser-handle" aria-hidden="true"></div>' +
    '<div class="sheet-head"><h2 id="gc-title">' + esc(S["chooser.title"]) + "</h2>" + IconButton({ id: "gc-close", label: S["form.close"], glyph: "✕" }) + "</div>" +
    '<p class="chooser-sub">' + esc(S["chooser.subtitle"]) + "</p>" +
    Choice({ id: "gc-known-deposit", tilt: "tilt-a", src: PICTURES.date, tone: "tone-mint", title: S["chooser.deposit.title"], sub: S["chooser.deposit.sub"], exA: S["chooser.deposit.exA"], exB: S["chooser.deposit.exB"] }) +
    Choice({ id: "gc-known-date", tilt: "tilt-b", src: PICTURES.deposit, tone: "tone-gold", title: S["chooser.date.title"], sub: S["chooser.date.sub"], exA: S["chooser.date.exA"], exB: S["chooser.date.exB"] }) +
    "</div>");
  var modal = createModal({ sheet: sheet });
  var opener = null, mode = null;
  sheet.querySelector("#gc-known-deposit").addEventListener("click", function () {
    var from = opener, m = mode;
    modal.close(); /* gives focus back to the opener first, then the form takes it */
    o.onKnownDeposit(from, m);
  });
  sheet.querySelector("#gc-known-date").addEventListener("click", function () {
    var from = opener;
    modal.close();
    o.onKnownDate(from);
  });
  sheet.querySelector("#gc-close").addEventListener("click", function () { modal.close(); });
  return {
    open: function (openerEl, presetMode) { opener = openerEl || null; mode = presetMode || null; modal.open(openerEl, "#gc-known-deposit"); },
    isOpen: function () { return modal.isOpen(); },
    destroy: function () { modal.destroy(); }
  };
}
