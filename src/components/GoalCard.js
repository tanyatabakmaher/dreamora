import { esc } from "../lib/dom.js";
import { computeGoal } from "../lib/calc.js";
import { fmtDate } from "../lib/format.js";
import { S } from "../strings.js";
import { Gauge } from "./Gauge.js";
import { Chip } from "./ui/Chip.js";
import { CoinsIcon, CalendarIcon, HourglassIcon, CheckCircleIcon } from "./ui/Icons.js";
import { TrackTag } from "./TrackTag.js";
import { ShareIndicator } from "./ShareIndicator.js";

/* One goal card (markup string), top to bottom: header (icon, name, track tag, private/shared marker at the end), gauge, two chips, then the monthly deposit row (or the achieved banner).
   Opening it for edit is handled by GoalList. */
export function GoalCard(g, today) {
  var c = computeGoal(g, today);
  var icon = g.image ? '<img src="' + esc(g.image) + '" alt="">' : esc(g.emoji || "🎯");
  var milestone = c.achieved
    ? '<div class="milestone milestone-done">' + esc(S["card.achievedBanner"]) + "</div>"
    : '<div class="milestone">' + CoinsIcon() + "<span>" +
        (g.monthlyDeposit > 0
          ? S["card.monthlyDeposit"].replace("{amount}", '<b class="num">' + Math.round(g.monthlyDeposit).toLocaleString("he-IL") + "</b>")
          : S["card.noDeposit"]) +
      "</span></div>";
  return '<article class="card' + (c.achieved ? " achieved" : "") + '" tabindex="0" role="button" data-id="' + esc(g.id) + '" aria-label="' + esc(S["action.edit"] + ": " + g.name) + '">' +
    (c.achieved ? '<div class="success-head">' + CheckCircleIcon() + "<span>" + esc(S["card.achievedHeader"]) + "</span></div>" : "") +
    '<div class="card-top"><span class="icon-box" aria-hidden="true">' + icon + "</span>" +
    '<div class="card-title"><h2>' + esc(g.name) + "</h2>" + TrackTag(g.trackId, g.annualReturnPct) +
    "</div>" + ShareIndicator(g) + "</div>" +
    '<div class="gauge">' + Gauge({ pct: c.progressPct, accumulated: c.balance, target: g.targetAmount, id: g.id.replace(/[^A-Za-z0-9_-]/g, "") }) + "</div>" +
    '<div class="chips">' +
    Chip({ tone: "lavender", icon: CalendarIcon(), label: S["card.target"], value: c.targetDate ? fmtDate(c.targetDate) : "—" }) +
    Chip({ tone: "sky", icon: HourglassIcon(), label: S["card.daysLeft"], value: c.daysRemaining === null ? "—" : S["card.daysValue"].replace("{days}", String(c.daysRemaining)) }) +
    "</div>" + milestone + "</article>";
}
