/* Budget storage ("התקציב שלי"). Same interface for both backends: load() -> Promise<{pool,income,expenses,saving,mode,savingManual} | null>, save(b).
   "local" keeps it in this browser (demo). "remote" keeps one row per account (row level security limits each user to their own row). */
import { getClient } from "./supabaseClient.js";

var KEY = "savings_budget_v1";
var INV_KEYS = ["investTrack", "investSince", "investRet", "investFee", "investHistory", "investMonthly"];
function clean(b) {
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  /* mode: "s" = the user types the monthly deposit, "ie" = income minus expenses. An older record without a mode is read from its numbers. */
  var oldS = n(b.income) === 0 && n(b.expenses) === 0 && n(b.saving) > 0;
  var mode = b.mode === "s" || b.mode === "ie" ? b.mode : oldS ? "s" : "ie";
  var manual = b.savingManual !== undefined ? n(b.savingManual) : b.saving_manual !== undefined ? n(b.saving_manual) : oldS ? n(b.saving) : 0;
  /* Investment of the unallocated money: investTrack / investSince = the current track and its start date (ISO), investRet / investFee = the user's own yearly return and fee for it (null = the track's defaults),
     investHistory = earlier periods [{ trackId, since, until, ret, fee }], investMonthly = the monthly amount the user chose for it (null = all that is left of the saving). Read and kept by the local repo only for now; toRow() leaves them out until the database has columns for them. */
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
function toRow(b) { var c = clean(b); return { pool: c.pool, income: c.income, expenses: c.expenses, saving: c.saving, mode: c.mode, saving_manual: c.savingManual }; }

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
      return client().then(function (c) { return c.from("budgets").select("pool,income,expenses,saving,mode,saving_manual").maybeSingle(); })
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
