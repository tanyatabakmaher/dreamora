/* Budget storage ("התקציב שלי"). Same interface for both backends: load() -> Promise<{pool,income,expenses,saving} | null>, save(b).
   "local" keeps it in this browser (demo). "remote" keeps one row per account (row level security limits each user to their own row). */
import { getClient } from "./supabaseClient.js";

var KEY = "savings_budget_v1";
function clean(b) {
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  return { pool: n(b.pool), income: n(b.income), expenses: n(b.expenses), saving: n(b.saving) };
}

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
      return client().then(function (c) { return c.from("budgets").select("pool,income,expenses,saving").maybeSingle(); })
        .then(ok).then(function (r) { return r.data ? clean(r.data) : null; });
    },
    save: function (b) {
      return client().then(function (c) { return c.from("budgets").upsert(clean(b), { onConflict: "user_id" }); }).then(ok).then(function () {});
    }
  };
}

export function createBudgetRepo(config) {
  return config.mode === "supabase" ? createRemoteBudgetRepo(config) : createLocalBudgetRepo();
}
