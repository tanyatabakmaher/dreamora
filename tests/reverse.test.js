import * as c from "../src/lib/calc.js";
import { planRows } from "../src/lib/reversePlan.js";
let fail = 0;
function check(name, cond, info) {
  if (!cond) { fail++; console.log("FAIL", name, info === undefined ? "" : info); }
  else console.log("ok  ", name, info === undefined ? "" : info);
}

// requiredDeposit: known values (T=20000, P=2000, 60 months)
let r = c.requiredDeposit(20000, 2000, 9.4, 60);
check("S&P net 9.4% needs about 221", r.status === "ok" && r.deposit >= 220 && r.deposit <= 222, r.deposit);
r = c.requiredDeposit(20000, 0, 9.4, 60);
check("no starting amount needs about 262", r.deposit >= 261 && r.deposit <= 263, r.deposit);
r = c.requiredDeposit(12000, 2000, 0, 20);
check("0% return: (T-P)/n = 500", r.status === "ok" && r.deposit === 500, r.deposit);
r = c.requiredDeposit(10000, 0, 9, 19);
check("T=10000 PMT 500 style: deposit for 19 months at 9% is at most 500", r.deposit <= 500 && r.deposit >= 480, r.deposit);

// Round trip: the rounded-up deposit always reaches the target within the chosen months
let bad = 0;
for (const T of [5000, 20000, 150000, 2000000]) for (const P of [0, 1000, 25000]) for (const pct of [0, 3.15, 4.4, 9.4]) for (const n of [1, 6, 12, 60, 240, 600]) {
  if (P >= T) continue;
  const q = c.requiredDeposit(T, P, pct, n);
  if (q.status === "achieved") { if (c.balanceAfter(P, 0, pct, n) < T - 1e-6) bad++; continue; }
  const m = c.monthsToGoal(T, P, q.deposit, pct);
  if (m.status !== "ok" && m.status !== "achieved") { bad++; continue; }
  if (m.months > n) bad++;
}
check("round trip: months to goal <= chosen months (all combinations)", bad === 0, bad);

// Edge cases
check("achieved when growth alone covers the target", c.requiredDeposit(10000, 9000, 20, 120).status === "achieved");
check("invalid for 0 months", c.requiredDeposit(10000, 0, 5, 0).status === "invalid");
check("invalid for target 0", c.requiredDeposit(0, 0, 5, 12).status === "invalid");

// monthsUntil
const d = (y, m, dd) => new Date(y, m - 1, dd);
check("monthsUntil exact 5 years = 60", c.monthsUntil(d(2026, 11, 16), d(2031, 11, 16)) === 60);
check("monthsUntil one day short = 59", c.monthsUntil(d(2026, 11, 16), d(2031, 11, 15)) === 59);
check("monthsUntil target before start = 0", c.monthsUntil(d(2026, 11, 16), d(2026, 1, 1)) === 0);
check("monthsUntil clamps month ends: 31 Jan to 28 Feb = 1", c.monthsUntil(d(2027, 1, 31), d(2027, 2, 28)) === 1);

// planRows
let rows = planRows(20000, 2000, 60);
const by = (id) => rows.find((x) => x.id === id);
check("rows follow TRACKS order and include every track", rows.length === 7 && rows[0].id === "sp500" && rows[6].id === "custom");
check("S&P defaults: gross 10, fee 0.6, net 9.4", by("sp500").gross === 10 && by("sp500").fee === 0.6 && by("sp500").net === 9.4);
check("custom has no deposit until a return is entered", by("custom").deposit === null && by("custom").status === "incomplete" && by("custom").barPct === 0);
const max = Math.max(...rows.filter((x) => x.deposit !== null).map((x) => x.deposit));
const top = rows.filter((x) => x.deposit === max);
check("the most expensive track is a full bar", top.every((x) => x.barPct === 100), top.map((x) => x.id).join());
check("bars are proportional to the largest deposit", Math.abs(by("sp500").barPct - by("sp500").deposit / max * 100) < 0.1, by("sp500").barPct);
check("lower return needs a higher deposit than S&P", by("deposit").deposit > by("sp500").deposit);
// the example from the design: 200 vs 400 is a half bar
const half = planRows(2000, 0, 10, { sp500: { ret: 0, fee: 0 }, equity: { ret: 0, fee: 0 }, age50: { ret: 0, fee: 0 } });
check("0% return 2000 over 10 months = 200", half[0].deposit === 200, half[0].deposit);
// edits
rows = planRows(20000, 2000, 60, { bonds: { ret: 5, fee: 0.8 } });
check("fee edit raises the deposit for that track only", by("bonds").deposit > planRows(20000, 2000, 60).find((x) => x.id === "bonds").deposit && by("sp500").deposit === planRows(20000, 2000, 60)[0].deposit);
check("edited flag set", by("bonds").edited === true && by("sp500").edited === false);
check("edited keeps the default deposit for the delta chip", by("bonds").defaultDeposit === planRows(20000, 2000, 60).find((x) => x.id === "bonds").deposit);
rows = planRows(20000, 2000, 60, { custom: { ret: 7, fee: "" } });
check("custom with a return gets a deposit; empty fee counts as 0", by("custom").deposit > 0 && by("custom").net === 7, by("custom").deposit);
rows = planRows(20000, 2000, 60, { sp500: { ret: 120, fee: 0.6 } });
check("out of range return gives no deposit", by("sp500").deposit === null);
rows = planRows(20000, 2000, 60, { sp500: { ret: 10, fee: 11 } });
check("out of range fee gives no deposit", by("sp500").deposit === null);
rows = planRows(20000, 2000, 60, { sp500: { ret: 10, fee: 20 } });
// fee higher than return floors net at 0 only when fee <= 10; return 5 fee 8 -> net 0
rows = planRows(20000, 0, 60, { sp500: { ret: 5, fee: 8 } });
check("fee above return floors net at 0 (deposit = T/n)", by("sp500").net === 0 && by("sp500").deposit === Math.ceil(20000 / 60), by("sp500").deposit);

if (fail) { console.log("\n" + fail + " FAILED"); process.exit(1); }
console.log("\nALL PASSED");
