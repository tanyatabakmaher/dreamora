import * as c from "../src/lib/calc.js";
let fail = 0;
function check(name, cond, info) {
  if (!cond) { fail++; console.log("FAIL", name, info === undefined ? "" : info); }
  else console.log("ok  ", name, info === undefined ? "" : info);
}

// Vector 1
let r = c.monthsToGoal(10000, 0, 500, 9);
check("v1 n=19", r.status === "ok" && r.months === 19, r.months);
const b19 = c.balanceAfter(0, 500, 9, 19), b18 = c.balanceAfter(0, 500, 9, 18);
check("v1 B(19)~10169", Math.abs(b19 - 10169) <= 1, b19.toFixed(2));
check("v1 B(18)~9598", Math.abs(b18 - 9598) <= 1, b18.toFixed(2));
// Vector 2
r = c.monthsToGoal(12000, 2000, 500, 0);
check("v2 n=20", r.status === "ok" && r.months === 20, r.months);
// Vector 3
r = c.monthsToGoal(2000, 1000, 0, 6);
check("v3 n~139", r.status === "ok" && Math.abs(r.months - 139) <= 1, r.months);
// Vector 4
r = c.monthsToGoal(5000, 5000, 100, 5);
check("v4 achieved", r.status === "achieved" && r.months === 0);
// Vector 5
r = c.monthsToGoal(1000, 0, 0, 0);
check("v5 unreachable", r.status === "unreachable");
r = c.monthsToGoal(1000, 0, 0, 5);
check("v5b unreachable (P=0, PMT=0, r>0)", r.status === "unreachable");
// too far
r = c.monthsToGoal(10000000, 0, 100, 3);
check("tooFar", r.status === "tooFar", r.months);

// Dates
const d = (s) => c.parseISODate(s);
check("addMonths clamp 31 Jan +1", c.toISODate(c.addMonths(d("2026-01-31"), 1)) === "2026-02-28");
check("addMonths +13", c.toISODate(c.addMonths(d("2026-11-14"), 13)) === "2027-12-14");
check("completed: 31 Jan -> 28 Feb = 1", c.completedMonths(d("2026-01-31"), d("2026-02-28")) === 1);
check("completed: 14 Nov -> 13 Dec = 0", c.completedMonths(d("2026-11-14"), d("2026-12-13")) === 0);
check("completed: 14 Nov -> 14 Dec = 1", c.completedMonths(d("2026-11-14"), d("2026-12-14")) === 1);
check("completed: future start = 0", c.completedMonths(d("2027-01-01"), d("2026-11-14")) === 0);

// computeGoal
const g = { targetAmount: 10000, initialAmount: 0, monthlyDeposit: 500, annualReturnPct: 9, startDate: "2026-03-14" };
let o = c.computeGoal(g, d("2026-11-14")); // 8 completed months
check("compute k=8", o.k === 8, o.k);
check("compute not achieved, pct sane", !o.achieved && o.progressPct > 38 && o.progressPct < 45, o.progressPct.toFixed(1));
check("compute targetDate = start+19m", c.toISODate(o.targetDate) === "2027-10-14", c.toISODate(o.targetDate));
o = c.computeGoal(g, d("2030-01-01"));
check("compute achieved late", o.achieved && o.remaining === 0 && o.progressPct === 100);

console.log(fail === 0 ? "ALL PASSED" : fail + " FAILED");
process.exit(fail === 0 ? 0 : 1);
