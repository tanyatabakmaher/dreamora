/* Budget storage ("התקציב שלי"). Same interface for both backends: load() -> Promise<{pool,income,expenses,saving,mode,savingManual} | null>, save(b).
   "local" keeps it in this browser (demo). "remote" keeps one row per account (row level security limits each user to their own row). */
import { getClient } from "./supabaseClient.js";

var KEY = "savings_budget_v1";
var INV_KEYS = ["investTrack", "investSince", "investRet", "investFee", "investHistory", "investMonthly"];
function clean(b) {
  /* a database row uses snake_case names */
  if (b.invest_track !== undefined || b.invest_since !== undefined || b.invest_history !== undefined) {
    b = Object.assign({}, b, { investTrack: b.invest_track || "", investSince: b.invest_since || "", investRet: b.invest_ret, investFee: b.invest_fee, investMonthly: b.invest_monthly, investHistory: b.invest_history });
  }
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  /* mode: "s" = the user types the monthly deposit, "ie" = income minus expenses. An older record without a mode is read from its numbers. */
  var oldS = n(b.income) === 0 && n(b.expenses) === 0 && n(b.saving) > 0;
  var mode = b.mode === "s" || b.mode === "ie" ? b.mode : oldS ? "s" : "ie";
  var manual = b.savingManual !== undefined ? n(b.savingManual) : b.saving_manual !== undefined ? n(b.saving_manual) : oldS ? n(b.saving) : 0;
  /* Investment of the unallocated money: investTrack / investSince = the current track and its start date (ISO), investRet / investFee = the user's own yearly return and fee for it (null = the track's defaults),
     investHistory = earlier periods [{ trackId, since, until, ret, fee }], investMonthly = the monthly amount the user chose for it (null = all that is left of the saving). Stored in the invest_* columns of the budgets table (supabase/013_budget_investment.sql). */
  function opt(v) { v = Number(v); return v === null || v === undefined || !isFinite(v) || v < 0 ? null : v; }
  function iso(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""; }
  var hist = Array.isArray(b.investHistory) ? b.investHistory.filter(function (h) { return h && typeof h.trackId === "string" && iso(h.since) && iso(h.until); })
    .map(function (h) { return { trackId: h.trackId, since: h.since, until: h.until, ret: h.ret === null || h.ret === undefined ? null : opt(h.ret), fee: h.fee === null || h.fee === undefined ? null : opt(h.fee) }; }) : [];
  var inv = {
    investTrack: typeof b.investTrack === "string" ? b.investTrack : "", investSince: typeof b.investSince === "string" ? b.investSince : "",
    investRet: b.investRet === null || b.investRet === undefined ? null : opt(b.investRet), investFee: b.investFee === null || b.investFee === undefined ? null : opt(b.investFee), investHistory: hist
  };
  return { pool: n(b.pool), income: n(b.income), expenses: n(b.expenses), saving: n(b.saving), mode: mode, savingManual: manual,
    investTrack: inv.investTrack, investSince: inv.investSince, investRet: inv.investRet, investFee: inv.investFee, investHistory: inv.investHistory,
    investMonthly: b.investMonthly === null || b.investMonthly === undefined ? null : opt(b.investMonthly) };
}
/* The investment columns are written only when the caller passes them (the budget page does not know about them, and an upsert without them leaves them as they are). */
function toRow(b) {
  var c = clean(b), row = { pool: c.pool, income: c.income, expenses: c.expenses, saving: c.saving, mode: c.mode, saving_manual: c.savingManual };
  if (b.investTrack !== undefined || b.investSince !== undefined) {
    row.invest_track = c.investTrack || null; row.invest_since = c.investSince || null; row.invest_ret = c.investRet; row.invest_fee = c.investFee;
    row.invest_monthly = c.investMonthly; row.invest_history = c.investHistory;
  }
  return row;
}
var COLS = "pool,income,expenses,saving,mode,saving_manual,invest_track,invest_since,invest_ret,invest_fee,invest_monthly,invest_history";

export function createLocalBudgetRepo() {
  return {
    load: function () {
      try { var raw = window.localStorage.getItem(KEY); return Promise.resolve(raw ? clean(JSON.parse(raw)) : null); }
      catch (e) { return Promise.resolve(null); }
    },
    save: function (b) {
      /* the budget page does not know about the investment: a save without those fields keeps what is stored */
      try {
        var old = null; try { old = JSON.parse(window.localStorage.getItem(KEY) || "null"); } catch (e) {}
        var keep = {}; INV_KEYS.forEach(function (k) { if (b[k] === undefined && old && old[k] !== undefined) keep[k] = old[k]; });
        window.localStorage.setItem(KEY, JSON.stringify(clean(Object.assign({}, b, keep)))); return Promise.resolve();
      }
      catch (e) { return Promise.reject({ storage: true }); }
    }
  };
}

export function createRemoteBudgetRepo(config) {
  var client = function () { return getClient(config); };
  function ok(r) { if (r.error) throw r.error; return r; }
  return {
    load: function () {
      return client().then(function (c) { return c.from("budgets").select(COLS).maybeSingle(); })
        .then(ok).then(function (r) { return r.data ? clean(r.data) : null; });
    },
    save: function (b) {
      return client().then(function (c) { return c.from("budgets").upsert(toRow(b), { onConflict: "user_id" }); }).then(ok).then(function () {});
    }
  };
}

export function createBudgetRepo(config) {
  return config.mode === "supabase" ? createRemoteBudgetRepo(config) : createLocalBudgetRepo();
}
