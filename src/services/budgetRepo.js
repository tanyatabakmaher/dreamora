/* Budget storage ("התקציב שלי"). Same interface for both backends: load() -> Promise<{pool,income,expenses,saving,mode,savingManual} | null>, save(b).
   "local" keeps it in this browser (demo). "remote" keeps one row per account (row level security limits each user to their own row). */
import { getClient } from "./supabaseClient.js";

var KEY = "savings_budget_v1";
function clean(b) {
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  /* mode: "s" = the user types the monthly deposit, "ie" = income minus expenses. An older record without a mode is read from its numbers. */
  var oldS = n(b.income) === 0 && n(b.expenses) === 0 && n(b.saving) > 0;
  var mode = b.mode === "s" || b.mode === "ie" ? b.mode : oldS ? "s" : "ie";
  var manual = b.savingManual !== undefined ? n(b.savingManual) : b.saving_manual !== undefined ? n(b.saving_manual) : oldS ? n(b.saving) : 0;
  /* investTrack / investSince: where the unallocated money is invested and since when. Read and kept by the local repo only for now; toRow() leaves them out until the database has columns for them. */
  var inv = { investTrack: typeof b.investTrack === "string" ? b.investTrack : "", investSince: typeof b.investSince === "string" ? b.investSince : "" };
  return { pool: n(b.pool), income: n(b.income), expenses: n(b.expenses), saving: n(b.saving), mode: mode, savingManual: manual, investTrack: inv.investTrack, investSince: inv.investSince };
}
function toRow(b) { var c = clean(b); return { pool: c.pool, income: c.income, expenses: c.expenses, saving: c.saving, mode: c.mode, saving_manual: c.savingManual }; }

export function createLocalBudgetRepo() {
  return {
    load: function () {
      try { var raw = window.localStorage.getItem(KEY); return Promise.resolve(raw ? clean(JSON.parse(raw)) : null); }
      catch (e) { return Promise.resolve(null); }
    },
    save: function (b) {
      try { window.localStorage.setItem(KEY, JSON.stringify(clean(b))); return Promise.resolve(); }
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
