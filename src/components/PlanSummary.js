import { monthsToGoal, parseISODate, addMonths } from "../lib/calc.js";
import { durText, fmtDate, money } from "../lib/format.js";
import { esc } from "../lib/dom.js";
import { TrackTag } from "./TrackTag.js";
import { S } from "../strings.js";
import { CalendarIcon, FlagIcon, CoinsIcon } from "./ui/Icons.js";
/* Live summary in the goal form. update(box, values, inputsOk, extra) fills the box and returns the plan (or null if inputs are incomplete).
   extra = { image, emoji, trackId } (the selected picture and track) is only used to show the goal header inside the summary. */
function header(v, extra) {
  var pic = extra.image ? '<img src="' + esc(extra.image) + '" alt="">' : esc(extra.emoji || "🎯");
  return '<div class="plan-head"><span class="plan-pic" aria-hidden="true">' + pic + '</span><div class="plan-title"><div class="plan-name">' + esc(v.name || S["form.title.create"]) + "</div>" +
    TrackTag(extra.trackId, v.ret) + "</div></div>";
}
export function updatePlanSummary(box, v, inputsOk, extra) {
  extra = extra || {};
  box.className = "summary";
  if (!inputsOk) { box.innerHTML = "<h3>" + S["summary.title"] + '</h3><p class="sub">—</p>'; return null; }
  var plan = monthsToGoal(v.target, v.initial, v.monthly, v.ret);
  if (plan.status === "unreachable") { box.className = "summary bad"; box.innerHTML = "<p>" + S["error.unreachable"] + "</p>"; }
  else if (plan.status === "tooFar") { box.className = "summary bad"; box.innerHTML = "<p>" + S["error.tooFar"] + "</p>"; }
  else if (plan.status === "achieved") { box.innerHTML = "<h3>" + S["summary.title"] + "</h3><p>" + S["summary.alreadyAchieved"] + "</p>"; }
  else {
    var startTxt = fmtDate(parseISODate(v.start)), endTxt = fmtDate(addMonths(parseISODate(v.start), plan.months));
    box.className = "summary plan";
    box.innerHTML = '<h3>' + S["summary.title"] + "</h3>" + header(v, extra) + '<p class="plan-main">' + S["summary.prefix"] + durText(plan.months) + "</p>" +
      '<p class="plan-date">' + S["summary.targetDate"] + '<span class="plan-date-val num">' + endTxt + "</span></p>" +
      '<p class="plan-pill">' + CalendarIcon() + "<span>" + S["summary.duration"] + durText(plan.months) + "</span></p>" +
      '<div class="tl" aria-hidden="true"><span class="tl-end tl-start">' + CalendarIcon() + '</span><span class="tl-line"><i style="inset-inline-start:25%"></i><i style="inset-inline-start:50%"></i><i style="inset-inline-start:75%"></i></span><span class="tl-end">' + FlagIcon() + "</span></div>" +
      '<div class="tl-labels"><div><b class="num">' + startTxt + "</b><span>" + S["summary.startLabel"] + '</span></div><div><b class="num">' + endTxt + "</b><span>" + S["summary.endLabel"] + "</span></div></div>" +
      '<div class="plan-deposit">' + CoinsIcon() + "<span>" + S["summary.monthly"] + '</span><b class="num">' + money(v.monthly) + "</b></div>";
  }
  return plan;
}
