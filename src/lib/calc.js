// calc.js - pure functions, no UI or storage dependencies.
// Monthly compounding, deposits at the end of each month.

export function monthlyRate(annualPct) {
  return annualPct / 100 / 12;
}

// Yearly return used in every calculation: the gross expected return minus the yearly management fee, never below 0. Rounded to 2 decimals for display and stability.
export function netReturnPct(grossPct, feePct) {
  const net = (Number(grossPct) || 0) - (Number(feePct) || 0);
  return Math.max(0, Math.round(net * 100) / 100);
}

// Balance after k completed months.
export function balanceAfter(P, PMT, annualPct, k) {
  const i = monthlyRate(annualPct);
  if (i === 0) return P + PMT * k;
  const g = Math.pow(1 + i, k);
  return P * g + (PMT * (g - 1)) / i;
}

// Months needed to reach target T. Returns { status, months }.
// status: "achieved" | "ok" | "unreachable" | "tooFar"
export function monthsToGoal(T, P, PMT, annualPct) {
  if (P >= T) return { status: "achieved", months: 0 };
  const i = monthlyRate(annualPct);
  let months;
  if (i > 0) {
    const den = P * i + PMT;
    if (den <= 0) return { status: "unreachable", months: null };
    const n = Math.log((T * i + PMT) / den) / Math.log(1 + i);
    months = Math.ceil(n - 1e-9);
  } else {
    if (PMT <= 0) return { status: "unreachable", months: null };
    months = Math.ceil((T - P) / PMT - 1e-9);
  }
  if (months > 600) return { status: "tooFar", months };
  return { status: "ok", months };
}

// Add calendar months; clamp the day to the last day of the target month.
export function addMonths(d, n) {
  const m = d.getMonth() + n;
  const ty = d.getFullYear() + Math.floor(m / 12);
  const tm = ((m % 12) + 12) % 12;
  const dim = new Date(ty, tm + 1, 0).getDate();
  return new Date(ty, tm, Math.min(d.getDate(), dim));
}

export function parseISODate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d) {
  const p = (x) => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

// Full calendar months elapsed between start and today (anchored to day of month).
export function completedMonths(start, today) {
  let k = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (k < 0) return 0;
  if (today < addMonths(start, k)) k--;
  return Math.max(k, 0);
}

export const MILESTONES = [25, 50, 75, 100];

// Smallest milestone strictly greater than progressPct, or null at 100%.
export function nextMilestone(progressPct) {
  for (const m of MILESTONES) if (m > progressPct) return m;
  return null;
}

// Largest milestone less than or equal to progressPct, or 0.
export function currentMilestone(progressPct) {
  let cur = 0;
  for (const m of MILESTONES) if (m <= progressPct + 1e-9) cur = m;
  return cur;
}

// Months until the balance reaches milestone m (25/50/75/100) of the target. null when it can never get there.
export function milestoneMonth(m, T, P, PMT, annualPct) {
  const r = monthsToGoal(T * m / 100, P, PMT, annualPct);
  return r.status === "unreachable" ? null : r.months;
}

// Whole days from today to targetDate, never negative; null when there is no target date.
export function daysRemaining(today, targetDate) {
  if (!targetDate) return null;
  return Math.max(0, Math.round((targetDate - today) / 86400000));
}

// Everything derived from a goal. Never stored.
export function computeGoal(goal, today) {
  const T = goal.targetAmount;
  const P = goal.initialAmount || 0;
  const PMT = goal.monthlyDeposit || 0;
  const r = netReturnPct(goal.annualReturnPct, goal.managementFeePct);
  const start = parseISODate(goal.startDate);
  const plan = monthsToGoal(T, P, PMT, r);
  const k = completedMonths(start, today);
  const balance = balanceAfter(P, PMT, r, k);
  const achieved = balance >= T;
  const progressPct = achieved ? 100 : Math.min(100, (balance / T) * 100);
  const remaining = Math.max(T - balance, 0);
  const targetDate = plan.months === null ? null : addMonths(start, plan.months);
  const nextMilestonePct = nextMilestone(progressPct);
  const amountToNextMilestone = nextMilestonePct === null ? 0 : Math.max(nextMilestonePct / 100 * T - balance, 0);
  return { plan, months: plan.months, targetDate, k, balance, achieved, progressPct, remaining,
    daysRemaining: daysRemaining(today, targetDate), nextMilestonePct, amountToNextMilestone };
}

