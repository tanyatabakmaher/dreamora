import { allocate, summarize, freeAmount, investedEstimate, stretchPlan, budgetGoals, investmentView, investDeposit, investRoom, investPeriods } from "../src/lib/budget.js";
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
s = summarize({ pool: 6000, income: 12000, expenses: 8500, saving: 2500 }, goals, today);
check("deposits fit but starting amounts do not: still over, no deposit gap", s.status === "over" && s.gap <= 0 && s.poolShort === 4000, s.status + " " + s.poolShort);
// allocate: first goals are covered first; the rest get what is left
let al = allocate({ pool: 70000, saving: 2000 }, goals, today);
check("deposits: first goal full, second partial, third none", al.rows[0].got === 1000 && al.rows[1].got === 1000 && al.rows[2].got === 0, al.rows.map((r) => r.got).join());
check("deposit flags follow the shortfall", !al.rows[0].depositShort && al.rows[1].depositShort && al.rows[2].depositShort);
check("starting amounts: pool 70,000 covers 5,000 + 3,000 + 2,000 fully", al.rows.every((r) => !r.initialShort) && al.initialGot === 10000);
al = allocate({ pool: 6000, saving: 5000 }, goals, today);
check("pool 6,000: first full 5,000, second gets 1,000, third 0", al.rows[0].initialGot === 5000 && al.rows[1].initialGot === 1000 && al.rows[2].initialGot === 0, al.rows.map((r) => r.initialGot).join());
check("initial shortfall is separate from the deposit shortfall", !al.rows[1].depositShort && al.rows[1].initialShort);
check("totals", al.depositNeed === 2300 && al.depositGot === 2300 && al.initialNeed === 10000 && al.initialGot === 6000);
// investment row: the unallocated money grown in its track since a date
const today2 = new Date(2026, 10, 21);
check("investment: no track or no date means no view", investmentView({}, 40000, today2) === null && investmentView({ investTrack: "equity" }, 40000, today2) === null && investmentView({ investTrack: "equity", investSince: "oops" }, 40000, today2) === null);
let iv = investmentView({ investTrack: "equity", investSince: "2025-05-21" }, 40000, today2);
const exp = 40000 * Math.pow(1 + 8.4 / 100 / 12, 18);
check("investment: 40,000 in the equity track for 18 months (net 8.4%)", iv && iv.netPct === 8.4 && Math.abs(iv.value - exp) < 0.01 && Math.abs(iv.earned - (exp - 40000)) < 0.01, iv && iv.value);
check("investment: earned share of the value", iv && Math.abs(iv.earnedSharePct - (exp - 40000) / exp * 100) < 1e-9);
iv = investmentView({ investTrack: "equity", investSince: "2027-01-01" }, 40000, today2);
check("investment: a start date in the future earns nothing", iv && iv.value === 40000 && iv.earned === 0 && iv.earnedSharePct === 0);
iv = investmentView({ investTrack: "deposit", investSince: "2026-05-21" }, 0, today2);
check("investment: nothing unallocated, nothing earned", iv && iv.value === 0 && iv.earned === 0);
iv = investmentView({ investTrack: "custom", investSince: "2025-11-21" }, 1000, today2);
check("investment: custom track has no default return and earns 0", iv && iv.netPct === 0 && iv.value === 1000);
// investment with a monthly deposit and a history of tracks
const grow = (v, net, k, dep) => { const i = net / 100 / 12; for (let m = 0; m < k; m++) v = v * (1 + i) + dep; return v; };
iv = investmentView({ investTrack: "equity", investSince: "2025-05-21" }, 40000, today2, 976);
let expD = grow(40000, 8.4, 18, 976);
check("investment + deposit: 40,000 and 976 a month for 18 months", iv && Math.abs(iv.value - expD) < 0.01 && iv.invested === 40000 + 976 * 18 && Math.abs(iv.earned - (expD - iv.invested)) < 0.01, iv && [iv.value, iv.invested, iv.earned].join());
check("investment + deposit: months counted", iv && iv.months === 18 && iv.periods.length === 1 && iv.periods[0].current);
const hb = { investTrack: "equity", investSince: "2025-05-21", investHistory: [{ trackId: "money_market", since: "2024-11-21", until: "2025-05-21", ret: null, fee: null }, { trackId: "deposit", since: "2024-05-21", until: "2024-11-21", ret: null, fee: null }] };
check("history: periods are read oldest first", investPeriods(hb).map((p) => p.trackId).join() === "deposit,money_market,equity" || investPeriods(hb).map((p) => p.trackId).join() === "money_market,deposit,equity");
const hb2 = { investTrack: "equity", investSince: "2025-05-21", investHistory: [{ trackId: "deposit", since: "2024-11-21", until: "2025-05-21", ret: null, fee: null }] };
iv = investmentView(hb2, 10000, today2, 500);
let expH = grow(grow(10000, 3.25, 6, 500), 8.4, 18, 500);
check("history: a past period grows at its own track, then the current one", iv && Math.abs(iv.value - expH) < 0.01 && iv.months === 24, iv && iv.value);
check("history: periods newest first, only the last is current", iv && iv.periods.length === 2 && iv.periods[0].trackId === "equity" && iv.periods[0].current && iv.periods[1].trackId === "deposit" && !iv.periods[1].current && iv.periods[1].months === 6);
iv = investmentView({ investTrack: "custom", investSince: "2025-11-21", investRet: 6, investFee: 1 }, 1000, today2, 0);
check("own return and fee for a period", iv && iv.netPct === 5 && Math.abs(iv.value - grow(1000, 5, 12, 0)) < 0.01);
check("investRoom = saving minus what the goals need, never below 0", investRoom({ saving: 6000, required: 5024 }) === 976 && investRoom({ saving: 1000, required: 1500 }) === 0);
const rs = { saving: 6000, required: 5024 };
check("investDeposit: all the room when nothing was chosen, the chosen amount when lower, never above the room", investDeposit(rs, {}) === 976 && investDeposit(rs, { investMonthly: null }) === 976 && investDeposit(rs, { investMonthly: 400 }) === 400 && investDeposit(rs, { investMonthly: 5000 }) === 976 && investDeposit(rs, { investMonthly: 0 }) === 0);
const sj = summarize({ pool: 80000, income: 0, expenses: 0, saving: 6000, investTrack: "equity", investSince: "2025-11-21" }, [g("x", { targetAmount: 200000, initialAmount: 40000, monthlyDeposit: 5024 })], today2);
const ivj = investmentView({ investTrack: "equity", investSince: "2025-11-21" }, 40000, today2, 976);
check("poolTotal = pool plus what the unallocated money grew by (deposits and interest)", sj.interest > 0 && Math.abs(sj.poolTotal - (80000 + ivj.value - 40000)) < 1e-6 && sj.unallocated === 40000, sj.interest);
check("what is left of the total after the goals' starting amounts is the investment's value", Math.abs((sj.poolTotal - sj.allocated) - ivj.value) < 1e-6);
check("the goals' starting amounts are compared with the total including interest", summarize({ pool: 40000, income: 0, expenses: 0, saving: 6000, investTrack: "equity", investSince: "2025-11-21" }, [g("y", { targetAmount: 200000, initialAmount: 40500, monthlyDeposit: 100 })], today2).poolShort === 0 && summarize({ pool: 40000, income: 0, expenses: 0, saving: 6000 }, [g("y", { targetAmount: 200000, initialAmount: 40500, monthlyDeposit: 100 })], today2).poolShort === 500);
check("no track: poolTotal is the pool itself", summarize({ pool: 1000, income: 0, expenses: 0, saving: 0 }, [], today2).poolTotal === 1000);
console.log(fail ? fail + " FAILED" : "all passed");
process.exit(fail ? 1 : 0);
