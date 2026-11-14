/* Goals storage. Same interface for both backends: load() -> Promise<goal[]>, save(goal), remove(id).
   "local" keeps goals in this browser (demo). "remote" keeps them per account in the database (row level security limits each user to their own rows). */
import { getClient } from "./supabaseClient.js";
import { addMonths, toISODate } from "../lib/calc.js";
import { todayDate } from "../lib/format.js";
import { uid } from "../lib/dom.js";
import { S } from "../strings.js";

var KEY = "savings_goals_v1", SEEDED = "savings_seeded_v1";

function validGoal(g) {
  return g && typeof g.id === "string" && typeof g.name === "string" && typeof g.startDate === "string" &&
    isFinite(g.targetAmount) && g.targetAmount > 0 && isFinite(g.monthlyDeposit) && isFinite(g.annualReturnPct);
}

function seedExamples() {
  var t = todayDate(), now = new Date().toISOString();
  return [
    { id: uid(), name: "טיול ליפן" + S["example.suffix"], emoji: "✈️", targetAmount: 15000, initialAmount: 2000, monthlyDeposit: 600,
      trackId: "equity", annualReturnPct: 9, startDate: toISODate(addMonths(t, -8)), createdAt: now },
    { id: uid(), name: "רכב חדש" + S["example.suffix"], emoji: "🚗", targetAmount: 60000, initialAmount: 5000, monthlyDeposit: 1500,
      trackId: "age50", annualReturnPct: 6.5, startDate: toISODate(addMonths(t, -2)), createdAt: now }
  ];
}

export function createLocalRepo() {
  function rd(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function wr(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  var list = null;
  function persist() { return wr(KEY, JSON.stringify(list)); }
  return {
    load: function () {
      var arr = [], raw = rd(KEY);
      if (raw) { try { var p = JSON.parse(raw); if (Array.isArray(p)) arr = p.filter(validGoal); } catch (e) {} }
      list = arr;
      if (!rd(SEEDED) && arr.length === 0) { list = seedExamples(); persist(); wr(SEEDED, "1"); }
      return Promise.resolve(list.slice());
    },
    save: function (g) {
      var i = list.findIndex(function (x) { return x.id === g.id; });
      var prev = list.slice();
      if (i >= 0) list[i] = g; else list.push(g);
      if (!persist()) { list = prev; return Promise.reject({ storage: true }); } /* never lose existing data */
      return Promise.resolve();
    },
    remove: function (id) { list = list.filter(function (x) { return x.id !== id; }); persist(); return Promise.resolve(); }
  };
}

function toRow(g) {
  return { id: g.id, name: g.name, emoji: g.emoji || null, image: g.image || null, target_amount: g.targetAmount, initial_amount: g.initialAmount || 0,
    monthly_deposit: g.monthlyDeposit, track_id: g.trackId, annual_return_pct: g.annualReturnPct, start_date: g.startDate, created_at: g.createdAt || new Date().toISOString() };
}
function fromRow(r) {
  return { id: r.id, name: r.name, emoji: r.emoji || "", image: r.image || null, targetAmount: Number(r.target_amount), initialAmount: Number(r.initial_amount),
    monthlyDeposit: Number(r.monthly_deposit), trackId: r.track_id, annualReturnPct: Number(r.annual_return_pct), startDate: r.start_date, createdAt: r.created_at };
}
function ok(r) { if (r.error) throw r.error; return r; }

export function createRemoteRepo(config) {
  var client = function () { return getClient(config); };
  return {
    load: function () {
      return client().then(function (c) { return c.from("goals").select("*").order("created_at", { ascending: true }); })
        .then(ok).then(function (r) { return r.data.map(fromRow).filter(validGoal); });
    },
    save: function (g) { return client().then(function (c) { return c.from("goals").upsert(toRow(g)); }).then(ok); },
    remove: function (id) { return client().then(function (c) { return c.from("goals").delete().eq("id", id); }).then(ok); }
  };
}

export function createGoalsRepo(config) {
  return config.mode === "supabase" ? createRemoteRepo(config) : createLocalRepo();
}
