import { esc } from "../lib/dom.js";
import { computeGoal, netReturnPct, parseISODate } from "../lib/calc.js";
import { permissionsOf } from "../lib/share.js";
import { fmtDate } from "../lib/format.js";
import { S } from "../strings.js";
import { Gauge } from "./Gauge.js";
import { Chip } from "./ui/Chip.js";
import { CoinsIcon, TrashIcon, CalendarIcon, HourglassIcon, CheckCircleIcon } from "./ui/Icons.js";
import { TrackTag } from "./TrackTag.js";
import { ShareIndicator, AvatarStack, getAvatarStack } from "./ShareIndicator.js";

/* Ready-made pictures have a larger copy for the wide banner (pics/cards/goal-N.webp); uploaded pictures are used as they are. */
function bannerSrc(src) { return String(src).replace(/^pics\/icons\/(goal-\d+\.webp)$/, "pics/cards/$1"); }

/* One goal card (markup string), top to bottom: picture banner (name and track tag on it, owner circle on its edge, private/shared marker in its corner), gauge, two chips, then the monthly deposit row (or the achieved banner).
   Opening it for edit is handled by GoalList. */
export function GoalCard(g, today, viewer) {
  var c = computeGoal(g, today);
  var banner = g.image
    ? '<img src="' + esc(bannerSrc(g.image)) + '" alt="" loading="lazy" decoding="async">'
    : '<span class="banner-emoji" aria-hidden="true">' + esc(g.emoji || "🎯") + "</span>";
  var milestone = c.achieved
    ? '<div class="milestone milestone-done">' + esc(S["card.achievedBanner"]) + "</div>"
    : '<div class="milestone">' + CoinsIcon() + "<span>" +
        (g.monthlyDeposit > 0
          ? S["card.monthlyDeposit"].replace("{amount}", '<b class="num">' + Math.round(g.monthlyDeposit).toLocaleString("he-IL") + "</b>")
          : S["card.noDeposit"]) +
      "</span></div>";
  var start = parseISODate(g.startDate), role = permissionsOf(g).role, canDelete = !g.fromOthers; /* the owner deletes; a participant leaves */
  /* Sits in the cream strip under the picture: when saving started, and the delete button (owners only). */
  var foot = '<div class="card-foot"><span class="card-start">' + (start ? esc(S["card.startedOn"].replace("{date}", fmtDate(start))) : "") + "</span>" +
    (canDelete ? '<button type="button" class="card-del" data-action="delete" aria-label="' + esc(S[role === "owner" ? "card.deleteAria" : "card.leaveAria"].replace("{name}", g.name)) + '">' + TrashIcon() + "</button>" : "") + "</div>";
  return '<article class="card' + (c.achieved ? " achieved" : "") + '" tabindex="0" role="button" data-id="' + esc(g.id) + '" aria-label="' + esc(S["action.edit"] + ": " + g.name) + '">' +
    (c.achieved ? '<div class="success-head">' + CheckCircleIcon() + "<span>" + esc(S["card.achievedHeader"]) + "</span></div>" : "") +
    '<div class="card-banner" style="--n:' + getAvatarStack(g, viewer).layers.length + '"><span class="banner-pic" aria-hidden="true">' + banner + "</span>" +
    '<div class="banner-tag">' + TrackTag(g.trackId, netReturnPct(g.annualReturnPct, g.managementFeePct)) + "</div>" +
    '<div class="banner-name">' + (g.ownerName ? '<div class="owner-line">' + esc(S["card.by"].replace("{name}", g.ownerName)) + "</div>" : "") + "<h2>" + esc(g.name) + "</h2></div>" +
    AvatarStack(g, viewer) + ShareIndicator(g) + "</div>" +
    '<div class="gauge">' + Gauge({ pct: c.progressPct, accumulated: c.balance, target: g.targetAmount, id: g.id.replace(/[^A-Za-z0-9_-]/g, "") }) + "</div>" +
    '<div class="chips">' +
    Chip({ tone: "lavender", icon: CalendarIcon(), label: S["card.target"], value: c.targetDate ? fmtDate(c.targetDate) : "—" }) +
    Chip({ tone: "sky", icon: HourglassIcon(), label: S["card.daysLeft"], value: c.daysRemaining === null ? "—" : S["card.daysValue"].replace("{days}", String(c.daysRemaining)) }) +
    "</div>" + milestone + foot + "</article>";
}
