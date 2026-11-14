/* Notifications storage. Same interface for both backends:
   load() -> Promise<notification[]> (newest first), add(items), markRead(id), markAllRead(), remove(ids), removeForGoal(goalId).
   "local" keeps them in this browser (demo). "remote" keeps them per account in the database; deleting a goal there deletes its notifications automatically. */
import { getClient } from "./supabaseClient.js";
import { MAX_NOTIFICATIONS } from "../lib/notifications.js";

var KEY = "savings_notifications_v1";

export function createLocalNotificationsRepo() {
  function rd() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function wr(list) { try { window.localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  var list = [];
  function sorted(a) {
    return a.map(function (n, i) { return { n: n, i: i }; })
      .sort(function (x, y) { return x.n.date < y.n.date ? 1 : x.n.date > y.n.date ? -1 : x.i - y.i; }).map(function (x) { return x.n; });
  }
  function commit(next) {
    var prev = list;
    list = next.slice(0, MAX_NOTIFICATIONS);
    if (!wr(list)) { list = prev; return Promise.reject({ storage: true }); }
    return Promise.resolve();
  }
  return {
    load: function () {
      var raw = rd(), arr = [];
      if (raw) { try { var p = JSON.parse(raw); if (Array.isArray(p)) arr = p.filter(function (n) { return n && typeof n.id === "string" && typeof n.date === "string"; }); } catch (e) {} }
      list = sorted(arr);
      return Promise.resolve(list.slice());
    },
    add: function (items) { return commit(sorted(items.concat(list))); },
    markRead: function (id) { return commit(list.map(function (n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; })); },
    markAllRead: function () { return commit(list.map(function (n) { return Object.assign({}, n, { read: true }); })); },
    remove: function (ids) { return commit(list.filter(function (n) { return ids.indexOf(n.id) < 0; })); },
    removeForGoal: function (goalId) { return commit(list.filter(function (n) { return n.goalId !== goalId; })); }
  };
}

function toRow(n) {
  return { id: n.id, goal_id: n.goalId || null, goal_name: n.goalName, type: n.type, milestone_pct: n.milestonePct || null,
    date: n.date, read: !!n.read, payload: n.payload || {} };
}
function fromRow(r) {
  var n = { id: r.id, goalId: r.goal_id, goalName: r.goal_name, type: r.type, date: r.date, read: !!r.read };
  if (r.milestone_pct) n.milestonePct = r.milestone_pct;
  if (r.payload && Object.keys(r.payload).length) n.payload = r.payload;
  return n;
}
function ok(r) { if (r.error) throw r.error; return r; }

export function createRemoteNotificationsRepo(config) {
  var client = function () { return getClient(config); };
  return {
    load: function () {
      return client().then(function (c) {
        return c.from("notifications").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(MAX_NOTIFICATIONS);
      }).then(ok).then(function (r) { return r.data.map(fromRow); });
    },
    add: function (items) {
      if (!items.length) return Promise.resolve();
      return client().then(function (c) { return c.from("notifications").upsert(items.map(toRow)); }).then(ok);
    },
    markRead: function (id) { return client().then(function (c) { return c.from("notifications").update({ read: true }).eq("id", id); }).then(ok); },
    markAllRead: function () { return client().then(function (c) { return c.from("notifications").update({ read: true }).eq("read", false); }).then(ok); },
    remove: function (ids) {
      if (!ids.length) return Promise.resolve();
      return client().then(function (c) { return c.from("notifications").delete().in("id", ids); }).then(ok);
    },
    removeForGoal: function () { return Promise.resolve(); } /* the database deletes them together with the goal */
  };
}

export function createNotificationsRepo(config) {
  return config.mode === "supabase" ? createRemoteNotificationsRepo(config) : createLocalNotificationsRepo();
}
