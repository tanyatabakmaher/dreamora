/* budget.js - pure budget logic ("התקציב שלי"). No UI, no storage.
   One savings pool: the goals' monthly deposits are compared with the monthly amount the user plans to save.
   Money that is not allocated to a goal earns nothing; the "if invested" figure is only an estimate. */
import { TRACKS, trackById } from "../data/tracks.js";
import { computeGoal, netReturnPct, monthsToGoal, addMonths, parseISODate, balanceAfter, completedMonths } from "./calc.js";

function num(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }

/* Goals that count against the budget: the user's own goals that are not achieved yet. */
export function budgetGoals(goals, today) {
  return (goals || []).filter(function (g) {
    return !g.fromOthers && (g.myRole === undefined || g.myRole === "owner") && !computeGoal(g, today).achieved;
  });
}

/* Who gets covered, in the order the goals are listed (the first goals have priority).
   The monthly saving is handed out to the goals' monthly deposits, and the savings pool to their starting amounts, each until it runs out.
   Returns { rows, depositGot, depositNeed, initialGot, initialNeed }; a row is { goal, need, got, initialNeed, initialGot, depositShort, initialShort }. */
export function allocate(b, goals, today) {
  var left = num(b.saving), poolLeft = num(b.pool);
  var out = { rows: [], depositGot: 0, depositNeed: 0, initialGot: 0, initialNeed: 0 };
  budgetGoals(goals, today).forEach(function (g) {
    var need = num(g.monthlyDeposit), init = num(g.initialAmount);
    var got = Math.min(need, left), igot = Math.min(init, poolLeft);
    left -= got; poolLeft -= igot;
    out.rows.push({ goal: g, need: need, got: got, initialNeed: init, initialGot: igot, depositShort: got < need - 1e-9, initialShort: igot < init - 1e-9 });
    out.depositGot += got; out.depositNeed += need; out.initialGot += igot; out.initialNeed += init;
  });
  return out;
}

/* What is left each month after expenses (can be negative). */
export function freeAmount(income, expenses) { return num(income) - num(expenses); }

/* b = { pool, income, expenses, saving }. Returns everything the page shows.
   status: "empty" (no active goals) | "fits" | "over". */
export function summarize(b, goals, today) {
  var mine = budgetGoals(goals, today);
  var required = mine.reduce(function (s, g) { return s + num(g.monthlyDeposit); }, 0);
  var allocated = mine.reduce(function (s, g) { return s + num(g.initialAmount); }, 0);
  var income = num(b.income), expenses = num(b.expenses), saving = num(b.saving), pool = num(b.pool);
  var free = income - expenses, gap = required - saving;
  var poolShort = Math.max(0, allocated - pool);
  var status = mine.length === 0 ? "empty" : gap <= 0 && poolShort <= 0 ? "fits" : "over"; /* over: the monthly deposits or the starting amounts do not fit */
  return {
    goals: mine, alloc: allocate(b, goals, today), required: required, free: free, saving: saving, gap: gap, status: status,
    savingTooHigh: saving > Math.max(free, 0),
    savingRatePct: income > 0 ? Math.round(saving / income * 1000) / 10 : null,
    allocated: allocated, unallocated: Math.max(0, pool - allocated), poolShort: poolShort,
    /* one tap fix: raise the saving to the required amount when the free money covers it */
    raiseTo: gap > 0 && required <= free ? required : null
  };
}

/* Yearly return the unallocated money would have earned in the default (first) track, net of its fee. An estimate, never promised. */
export function investedEstimate(amount) {
  var t = TRACKS[0], net = netReturnPct(t.defaultReturnPct, t.defaultFeePct);
  return { netPct: net, perYear: Math.round(num(amount) * net / 100) };
}

/* The money that is not allocated to a goal, invested in a track since a date ("השקעה" row of the summary).
   b = { investTrack, investSince (ISO date) }; base = the unallocated amount. Returns null when no track or date is set.
   No deposits are added: value = base grown at the track's net yearly return for the full months since the start date. An estimate, never promised. */
export function investmentView(b, base, today) {
  if (!b || !b.investTrack || !b.investSince) return null;
  var start = parseISODate(b.investSince);
  if (!start || isNaN(start.getTime())) return null;
  var t = trackById(b.investTrack), net = netReturnPct(t.defaultReturnPct || 0, t.defaultFeePct), amount = num(base);
  var value = balanceAfter(amount, 0, net, completedMonths(start, today)), earned = Math.max(0, value - amount);
  return { trackId: t.id, label: t.labelHe, netPct: net, base: amount, value: value, earned: earned, since: b.investSince, earnedSharePct: value > 0 ? earned / value * 100 : 0 };
}

/* If only `saving` per month is available: every goal gets the same share of its planned deposit, and the new target date follows.
   Returns one row per goal: { id, name, oldDate, newDate, status } (newDate is null when the goal can no longer be reached). Empty when the budget already fits. */
export function stretchPlan(goals, saving, today) {
  var mine = budgetGoals(goals, today);
  var required = mine.reduce(function (s, g) { return s + num(g.monthlyDeposit); }, 0);
  if (required <= 0 || num(saving) >= required) return [];
  var factor = num(saving) / required;
  return mine.map(function (g) {
    var r = netReturnPct(g.annualReturnPct, g.managementFeePct), start = parseISODate(g.startDate);
    var old = monthsToGoal(g.targetAmount, num(g.initialAmount), num(g.monthlyDeposit), r);
    var now = monthsToGoal(g.targetAmount, num(g.initialAmount), num(g.monthlyDeposit) * factor, r);
    return { id: g.id, name: g.name, emoji: g.emoji || "",
      oldDate: old.months === null ? null : addMonths(start, old.months),
      newDate: now.status === "ok" ? addMonths(start, now.months) : null,
      status: now.status };
  });
}
