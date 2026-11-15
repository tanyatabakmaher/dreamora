import { monthsToGoal, parseISODate, addMonths } from "../lib/calc.js";
import { durText, fmtDate } from "../lib/format.js";
import { S } from "../strings.js";
import { CalendarIcon, FlagIcon } from "./ui/Icons.js";
/* Live summary under the goal form. update(box, values) fills the box and returns the plan (or null if inputs are incomplete). */
export function updatePlanSummary(box, v, inputsOk) {
  box.className = "summary";
  if (!inputsOk) { box.innerHTML = "<h3>" + S["summary.title"] + '</h3><p class="sub">—</p>'; return null; }
  var plan = monthsToGoal(v.target, v.initial, v.monthly, v.ret);
  if (plan.status === "unreachable") { box.className = "summary bad"; box.innerHTML = "<p>" + S["error.unreachable"] + "</p>"; }
  else if (plan.status === "tooFar") { box.className = "summary bad"; box.innerHTML = "<p>" + S["error.tooFar"] + "</p>"; }
  else if (plan.status === "achieved") { box.innerHTML = "<h3>" + S["summary.title"] + "</h3><p>" + S["summary.alreadyAchieved"] + "</p>"; }
  else {
    var startTxt = fmtDate(parseISODate(v.start)), endTxt = fmtDate(addMonths(parseISODate(v.start), plan.months));
    box.className = "summary plan";
    box.innerHTML = '<h3>' + S["summary.title"] + '</h3><p class="plan-main">' + S["summary.prefix"] + durText(plan.months) + "</p>" +
      '<p class="plan-date">' + S["summary.targetDate"] + '<span class="plan-date-val num">' + endTxt + "</span></p>" +
      '<p class="plan-pill">' + CalendarIcon() + "<span>" + S["summary.duration"] + durText(plan.months) + "</span></p>" +
      '<div class="tl" aria-hidden="true"><span class="tl-end tl-start">' + CalendarIcon() + '</span><span class="tl-line"><i style="inset-inline-start:25%"></i><i style="inset-inline-start:50%"></i><i style="inset-inline-start:75%"></i></span><span class="tl-end">' + FlagIcon() + "</span></div>" +
      '<div class="tl-labels"><div><b class="num">' + startTxt + "</b><span>" + S["summary.startLabel"] + '</span></div><div><b class="num">' + endTxt + "</b><span>" + S["summary.endLabel"] + "</span></div></div>";
  }
  return plan;
}
