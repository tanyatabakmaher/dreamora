import { monthsToGoal, parseISODate, addMonths } from "../lib/calc.js";
import { durText, fmtDate } from "../lib/format.js";
import { S } from "../strings.js";
/* Live summary under the goal form. update(box, values) fills the box and returns the plan (or null if inputs are incomplete). */
export function updatePlanSummary(box, v, inputsOk) {
  box.className = "summary";
  if (!inputsOk) { box.innerHTML = "<h3>" + S["summary.title"] + '</h3><p class="sub">—</p>'; return null; }
  var plan = monthsToGoal(v.target, v.initial, v.monthly, v.ret);
  if (plan.status === "unreachable") { box.className = "summary bad"; box.innerHTML = "<p>" + S["error.unreachable"] + "</p>"; }
  else if (plan.status === "tooFar") { box.className = "summary bad"; box.innerHTML = "<p>" + S["error.tooFar"] + "</p>"; }
  else if (plan.status === "achieved") { box.innerHTML = "<h3>" + S["summary.title"] + "</h3><p>" + S["summary.alreadyAchieved"] + "</p>"; }
  else {
    box.innerHTML = "<h3>" + S["summary.title"] + "</h3><p>" + S["summary.prefix"] + durText(plan.months) + '</p><p class="sub num">' +
      S["summary.targetDate"] + fmtDate(addMonths(parseISODate(v.start), plan.months)) + "</p>";
  }
  return plan;
}
