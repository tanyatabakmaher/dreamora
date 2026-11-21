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
  /* what the unallocated money has become in its track (the monthly deposits that went into it plus the interest) is part of what the user has: the total (poolTotal) is what everything else compares the goals' starting amounts with, so what is left of it is exactly the investment's value */
  var base = Math.max(0, pool - allocated), room = Math.max(0, saving - required);
  var deposit = b.investMonthly !== null && b.investMonthly !== undefined ? Math.min(num(b.investMonthly), room) : room;
  var iv = b.investTrack ? investmentView(b, base, today, deposit) : null;
  var interest = iv ? iv.earned : 0, poolTotal = pool + (iv ? Math.max(0, iv.value - base) : 0);
  var poolShort = Math.max(0, allocated - poolTotal);
  var status = mine.length === 0 ? "empty" : gap <= 0 && poolShort <= 0 ? "fits" : "over"; /* over: the monthly deposits or the starting amounts do not fit */
  return {
    goals: mine, alloc: allocate(Object.assign({}, b, { pool: poolTotal }), goals, today), required: required, free: free, saving: saving, gap: gap, status: status,
    savingTooHigh: saving > Math.max(free, 0),
    savingRatePct: income > 0 ? Math.round(saving / income * 1000) / 10 : null,
    allocated: allocated, unallocated: base, interest: interest, poolTotal: poolTotal, poolShort: poolShort,
    /* one tap fix: raise the saving to the required amount when the free money covers it */
    raiseTo: gap > 0 && required <= free ? required : null
  };
}

/* Yearly return the unallocated money would have earned in the default (first) track, net of its fee. An estimate, never promised. */
export function investedEstimate(amount) {
  var t = TRACKS[0], net = netReturnPct(t.defaultReturnPct, t.defaultFeePct);
  return { netPct: net, perYear: Math.round(num(amount) * net / 100) };
}

/* What is left of the monthly saving after the goals' deposits: the most that can go to the investment each month. */
export function investRoom(s) { return Math.max(0, num(s.saving) - num(s.required)); }
/* The monthly amount that goes to the investment: what the user chose (b.investMonthly), never more than what is left; all of what is left when nothing was chosen. */
export function investDeposit(s, b) {
  var room = investRoom(s);
  return b && b.investMonthly !== null && b.investMonthly !== undefined ? Math.min(num(b.investMonthly), room) : room;
}

/* The investment as a list of periods, oldest first: each past period is { trackId, since, until, ret, fee } (b.investHistory, ISO dates),
   the current one starts at b.investSince and has no end. ret / fee are the user's own yearly return and fee for that period, or null for the track's defaults. */
export function investPeriods(b) {
  if (!b || !b.investTrack || !b.investSince) return [];
  var out = [];
  (b.investHistory || []).forEach(function (h) {
    var a = parseISODate(h.since), z = parseISODate(h.until);
    if (a && z && !isNaN(a.getTime()) && !isNaN(z.getTime())) out.push({ trackId: h.trackId, since: a, until: z, ret: h.ret === undefined ? null : h.ret, fee: h.fee === undefined ? null : h.fee });
  });
  var cur = parseISODate(b.investSince);
  if (!cur || isNaN(cur.getTime())) return [];
  out.push({ trackId: b.investTrack, since: cur, until: null, ret: b.investRet === undefined ? null : b.investRet, fee: b.investFee === undefined ? null : b.investFee });
  return out;
}
/* Net yearly return of one period (the user's own numbers when set, the track's defaults otherwise). */
export function periodNetPct(p) {
  var t = trackById(p.trackId);
  var gross = p.ret !== null && p.ret !== undefined ? p.ret : (t.defaultReturnPct || 0), fee = p.fee !== null && p.fee !== undefined ? p.fee : t.defaultFeePct;
  return netReturnPct(gross, fee);
}

/* The money that is not allocated to a goal, invested in tracks since a date ("השקעה" row of the summary and the investment dialog).
   b = { investTrack, investSince (ISO date), investRet, investFee, investHistory }; base = the unallocated amount at the start; deposit = the monthly amount added to it (default 0).
   Only the current period counts (from its start date, at its own net yearly return, each completed month adds the deposit); past periods are a record of dates. Returns null when no track or date is set. An estimate, never promised.
   Result: { trackId, label, netPct, base, value, earned, since, earnedSharePct, invested, months, periods: [{ trackId, label, netPct, since, until, months, current }] } (periods newest first). */
export function investmentView(b, base, today, deposit) {
  var periods = investPeriods(b);
  if (!periods.length) return null;
  var amount = num(base), dep = num(deposit), value = amount, months = 0, rows = [];
  periods.forEach(function (p, i) {
    var net = periodNetPct(p), end = p.until || today, k = completedMonths(p.since, end);
    /* past periods are only a record (dates and months): the value counts from the current start date, at the current track's own return */
    var cur = !p.until; if (cur) { value = balanceAfter(value, dep, net, k); months += k; }
    rows.push({ trackId: p.trackId, label: trackById(p.trackId).labelHe, netPct: net, since: p.since, until: p.until, months: k, current: i === periods.length - 1 });
  });
  var last = rows[rows.length - 1], invested = amount + dep * months, earned = Math.max(0, value - invested);
  return { trackId: last.trackId, label: last.label, netPct: last.netPct, base: amount, value: value, earned: earned, since: b.investSince, earnedSharePct: value > 0 ? earned / value * 100 : 0, invested: invested, months: months, periods: rows.slice().reverse() };
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
