/* Goals storage. Same interface for both backends: load() -> Promise<goal[]>, save(goal), remove(id).
   "local" keeps goals in this browser (demo). "remote" keeps them per account in the database (row level security limits each user to their own rows). */
import { getClient } from "./supabaseClient.js";
import { createSharingApi } from "./sharingApi.js";
import { createImageStore } from "./imageStore.js";
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
      trackId: "equity", annualReturnPct: 9, managementFeePct: 0.6, startDate: toISODate(addMonths(t, -8)), createdAt: now, notifiedMilestonePct: 0 },
    { id: uid(), name: "רכב חדש" + S["example.suffix"], emoji: "🚗", targetAmount: 60000, initialAmount: 5000, monthlyDeposit: 1500,
      trackId: "age50", annualReturnPct: 6.5, managementFeePct: 0.55, startDate: toISODate(addMonths(t, -2)), createdAt: now, notifiedMilestonePct: 0 }
  ];
}

/* A public goal of another user (read only): shown only under the "public" filter. */
function fromPublicRow(r) {
  return { id: r.id, name: r.name, emoji: r.emoji || "", image: r.image || null, targetAmount: Number(r.target_amount), initialAmount: Number(r.initial_amount),
    monthlyDeposit: Number(r.monthly_deposit), trackId: r.track_id, annualReturnPct: Number(r.annual_return_pct), managementFeePct: Number(r.management_fee_pct) || 0,
    startDate: r.start_date, createdAt: r.created_at, members: [], myRole: "view", isPublic: true, fromOthers: true, ownerName: r.owner_name || "" };
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
    remove: function (id) { list = list.filter(function (x) { return x.id !== id; }); persist(); return Promise.resolve(); },
    loadPublicOthers: function () { return Promise.resolve([]); } /* demo mode has no other users */
  };
}

function toRow(g) {
  return { id: g.id, name: g.name, emoji: g.emoji || null, image: g.image || null, target_amount: g.targetAmount, initial_amount: g.initialAmount || 0,
    monthly_deposit: g.monthlyDeposit, track_id: g.trackId, annual_return_pct: g.annualReturnPct, management_fee_pct: g.managementFeePct || 0, start_date: g.startDate, created_at: g.createdAt || new Date().toISOString(), is_public: !!g.isPublic,
    notified_milestone_pct: g.notifiedMilestonePct === undefined ? null : g.notifiedMilestonePct };
}
function fromRow(r) {
  return { id: r.id, name: r.name, emoji: r.emoji || "", image: r.image || null, targetAmount: Number(r.target_amount), initialAmount: Number(r.initial_amount),
    monthlyDeposit: Number(r.monthly_deposit), trackId: r.track_id, annualReturnPct: Number(r.annual_return_pct), managementFeePct: Number(r.management_fee_pct) || 0, startDate: r.start_date, createdAt: r.created_at,
    members: [], myRole: "owner", isPublic: !!r.is_public,
    notifiedMilestonePct: r.notified_milestone_pct === null || r.notified_milestone_pct === undefined ? undefined : r.notified_milestone_pct };
}
function ok(r) { if (r.error) throw r.error; return r; }

export function createRemoteRepo(config) {
  var client = function () { return getClient(config); };
  var sharing = createSharingApi(config);
  var images = createImageStore(config);
  var known = {}; /* goal id -> picture currently stored, so a replaced or removed picture can be deleted */
  /* Goals come back with the participants and the signed-in user's permission on each (members never include the user themselves). */
  function withSharing(goals) {
    return sharing.loadMembers(goals.map(function (g) { return g.id; })).then(function (map) {
      return goals.map(function (g) { var e = map[g.id]; return e ? Object.assign(g, { members: e.members, myRole: e.myRole }) : g; });
    }).catch(function () { return goals; }); /* a failed lookup shows the goals without participants rather than nothing */
  }
  return {
    load: function () {
      return client().then(function (c) { return c.from("goals").select("*").order("created_at", { ascending: true }); })
        .then(ok).then(function (r) {
          var goals = r.data.map(fromRow).filter(validGoal);
          goals.forEach(function (g) { known[g.id] = g.image; });
          return withSharing(goals);
        });
    },
    /* Up to 10 random public goals of other users (the database picks them; a new draw on every call). */
    loadPublicOthers: function () {
      return client().then(function (c) { return c.rpc("get_random_public_goals", { p_limit: 10 }); }).then(ok)
        .then(function (r) { return (r.data || []).map(fromPublicRow).filter(validGoal); });
    },
    save: function (g) {
      /* A new picture is uploaded first and the goal keeps its URL; an old file that is no longer used is deleted afterwards. */
      return images.resolve(g.image).then(function (url) {
        g.image = url;
        return client().then(function (c) { return c.from("goals").upsert(toRow(g)); }).then(ok).then(function () {
          if (known[g.id] && known[g.id] !== url) images.discard(known[g.id]);
          known[g.id] = url;
        });
      });
    },
    remove: function (id) {
      return client().then(function (c) { return c.from("goals").delete().eq("id", id); }).then(ok).then(function () { images.discard(known[id]); delete known[id]; });
    }
  };
}

export function createGoalsRepo(config) {
  return config.mode === "supabase" ? createRemoteRepo(config) : createLocalRepo();
}
