// calc.js - pure functions, no UI or storage dependencies.
// Monthly compounding, deposits at the end of each month.

export function monthlyRate(annualPct) {
  return annualPct / 100 / 12;
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

// Everything derived from a goal. Never stored.
export function computeGoal(goal, today) {
  const T = goal.targetAmount;
  const P = goal.initialAmount || 0;
  const PMT = goal.monthlyDeposit || 0;
  const r = goal.annualReturnPct || 0;
  const start = parseISODate(goal.startDate);
  const plan = monthsToGoal(T, P, PMT, r);
  const k = completedMonths(start, today);
  const balance = balanceAfter(P, PMT, r, k);
  const achieved = balance >= T;
  const progressPct = achieved ? 100 : Math.min(100, (balance / T) * 100);
  const remaining = Math.max(T - balance, 0);
  const targetDate = plan.months === null ? null : addMonths(start, plan.months);
  return { plan, months: plan.months, targetDate, k, balance, achieved, progressPct, remaining };
}

