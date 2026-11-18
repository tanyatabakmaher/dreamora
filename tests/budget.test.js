import { allocate, summarize, freeAmount, investedEstimate, stretchPlan, budgetGoals } from "../src/lib/budget.js";
let fail = 0;
function check(name, cond, info) {
  if (!cond) { fail++; console.log("FAIL", name, info === undefined ? "" : info); }
  else console.log("ok  ", name, info === undefined ? "" : info);
}
const today = new Date(2026, 10, 18);
const g = (id, over) => Object.assign({ id, name: id, targetAmount: 20000, initialAmount: 0, monthlyDeposit: 1000, annualReturnPct: 0, managementFeePct: 0, startDate: "2026-11-01" }, over);
// the numbers from the approved design: free 3,500; goals 1,000 + 1,100 + 200 = 2,300
const goals = [g("a", { monthlyDeposit: 1000, initialAmount: 5000 }), g("b", { monthlyDeposit: 1100, initialAmount: 3000 }), g("c", { monthlyDeposit: 200, initialAmount: 2000 })];
let s = summarize({ pool: 20000, income: 12000, expenses: 8500, saving: 2000 }, goals, today);
check("free = income - expenses", s.free === 3500 && freeAmount(12000, 8500) === 3500);
check("required = sum of deposits", s.required === 2300, s.required);
check("saving below required is over, gap 300", s.status === "over" && s.gap === 300, s.gap);
check("quick fix raises saving to 2,300 because free covers it", s.raiseTo === 2300);
check("saving rate 16.7%", s.savingRatePct === 16.7, s.savingRatePct);
check("unallocated = pool - initial amounts = 10,000", s.unallocated === 10000 && s.poolShort === 0, s.unallocated);
s = summarize({ pool: 20000, income: 12000, expenses: 8500, saving: 2500 }, goals, today);
check("saving above required fits", s.status === "fits" && s.raiseTo === null);
s = summarize({ pool: 0, income: 5000, expenses: 4500, saving: 500 }, goals, today);
check("required above free: no one-tap fix", s.status === "over" && s.raiseTo === null && s.savingTooHigh === false);
check("initial amounts above the pool are flagged", s.poolShort === 10000, s.poolShort);
s = summarize({ pool: 1000, income: 5000, expenses: 4500, saving: 800 }, [], today);
check("no goals: empty status", s.status === "empty" && s.required === 0);
s = summarize({ pool: 0, income: 5000, expenses: 4500, saving: 800 }, goals, today);
check("saving above the free amount is flagged", s.savingTooHigh === true);
check("negative free amount is allowed", freeAmount(1000, 3000) === -2000);
// achieved, shared-with-me and others' goals do not count
const mixed = [g("x", { targetAmount: 1000, initialAmount: 1000 }), g("y", { fromOthers: true }), g("z", { myRole: "view" }), g("ok")];
check("only active own goals count", budgetGoals(mixed, today).map((x) => x.id).join() === "ok");
// estimate: 10,000 at S&P default net 9.4% = 940
const e = investedEstimate(10000);
check("invested estimate 10,000 at net 9.4% = 940", e.netPct === 9.4 && e.perYear === 940, e.perYear);
check("invested estimate of nothing is 0", investedEstimate(0).perYear === 0);
// stretch plan at 0% return: 20000 at 1000/month = 20 months; at 500/month = 40 months
const one = [g("a")];
let p = stretchPlan(one, 500, today);
check("half the saving doubles the time", p.length === 1 && p[0].status === "ok" && (p[0].newDate.getFullYear() * 12 + p[0].newDate.getMonth()) - (p[0].oldDate.getFullYear() * 12 + p[0].oldDate.getMonth()) === 20);
check("no stretch needed when it fits", stretchPlan(one, 1000, today).length === 0);
p = stretchPlan(one, 0, today);
check("zero saving: goal becomes unreachable", p[0].newDate === null && p[0].status === "unreachable");
// allocate: first goals are covered first; the rest get what is left
let al = allocate({ pool: 70000, saving: 2000 }, goals, today);
check("deposits: first goal full, second partial, third none", al.rows[0].got === 1000 && al.rows[1].got === 1000 && al.rows[2].got === 0, al.rows.map((r) => r.got).join());
check("deposit flags follow the shortfall", !al.rows[0].depositShort && al.rows[1].depositShort && al.rows[2].depositShort);
check("starting amounts: pool 70,000 covers 5,000 + 3,000 + 2,000 fully", al.rows.every((r) => !r.initialShort) && al.initialGot === 10000);
al = allocate({ pool: 6000, saving: 5000 }, goals, today);
check("pool 6,000: first full 5,000, second gets 1,000, third 0", al.rows[0].initialGot === 5000 && al.rows[1].initialGot === 1000 && al.rows[2].initialGot === 0, al.rows.map((r) => r.initialGot).join());
check("initial shortfall is separate from the deposit shortfall", !al.rows[1].depositShort && al.rows[1].initialShort);
check("totals", al.depositNeed === 2300 && al.depositGot === 2300 && al.initialNeed === 10000 && al.initialGot === 6000);
console.log(fail ? fail + " FAILED" : "all passed");
process.exit(fail ? 1 : 0);
