import { esc } from "../lib/dom.js";
import { computeGoal } from "../lib/calc.js";
import { money, fmtDate } from "../lib/format.js";
import { S } from "../strings.js";
import { Gauge } from "./Gauge.js";
/* One goal as a card (markup string). Clicking/Enter on it is handled by GoalList. */
export function GoalCard(g, today) {
  var c = computeGoal(g, today);
  var pct = c.achieved ? 100 : Math.floor(c.progressPct);
  var label = S["a11y.progress"].replace("{pct}", String(pct));
  var dial = c.progressPct >= 100 || c.achieved ? 100 : Math.min(c.progressPct, 99.99);
  return '<article class="card' + (c.achieved ? " achieved" : "") + '" tabindex="0" role="button" data-id="' + esc(g.id) + '" aria-label="' + esc(S["action.edit"] + ": " + g.name) + '">' +
    '<div class="card-top"><span class="emoji" aria-hidden="true">' + (g.image ? '<img src="' + esc(g.image) + '" alt="">' : esc(g.emoji || "🎯")) + "</span><h2>" + esc(g.name) + "</h2>" +
    (c.achieved ? '<span class="badge">' + S["card.achievedBadge"] + "</span>" : "") + "</div>" +
    '<div class="gauge">' + Gauge(dial, label) + '<div class="gauge-num num" aria-hidden="true">' + pct + "<small>%</small></div></div>" +
    '<dl class="facts"><div><dt>' + S["card.remaining"] + '</dt><dd class="num">' + money(c.remaining) + "</dd></div>" +
    "<div><dt>" + S["card.targetDate"] + '</dt><dd class="num">' + (c.targetDate ? fmtDate(c.targetDate) : "—") + "</dd></div></dl></article>";
}
