/* In-app notifications: pure functions, no UI and no storage.
   Notification = { id, goalId, goalName, type: "milestone"|"achieved"|"shareRequest", milestonePct?, date: "YYYY-MM-DD", read, payload? }
   "shareRequest" is reserved for the sharing phase: it can be shown, but nothing in Phase 1 creates it. */
import { MILESTONES, computeGoal, currentMilestone, milestoneMonth, addMonths, parseISODate, toISODate } from "./calc.js";
import { uid } from "./dom.js";

export var MAX_NOTIFICATIONS = 50;

/* Newest first. Same-day items keep their given order (so newer-created first when the caller puts them first). */
function sortNewestFirst(list) {
  return list.map(function (n, i) { return { n: n, i: i }; })
    .sort(function (a, b) { return a.n.date < b.n.date ? 1 : a.n.date > b.n.date ? -1 : a.i - b.i; })
    .map(function (x) { return x.n; });
}

/* Goals that existed before notifications (no notifiedMilestonePct) get it set silently to their current milestone, so history is not announced. */
export function migrateGoals(goals, today) {
  var changed = [];
  var out = goals.map(function (g) {
    if (g.notifiedMilestonePct !== undefined && g.notifiedMilestonePct !== null) return g;
    var ng = Object.assign({}, g, { notifiedMilestonePct: currentMilestone(computeGoal(g, today).progressPct) });
    changed.push(ng);
    return ng;
  });
  return { goals: out, changed: changed };
}

/* Creates one notification per newly crossed milestone, then records the highest milestone on the goal.
   Returns { goals (all, updated), changedGoals, created, notifications (existing + created, newest first, at most 50), dropped (ids trimmed) }.
   Idempotent: a second run with the result creates nothing. */
export function syncNotifications(goals, existing, today, opts) {
  var make = (opts && opts.newId) ? opts.newId : uid;
  var created = [], changedGoals = [];
  var out = goals.map(function (g) {
    var c = computeGoal(g, today);
    var cur = currentMilestone(c.progressPct);
    var done = g.notifiedMilestonePct || 0;
    if (cur <= done && g.notifiedMilestonePct !== undefined) return g;
    MILESTONES.forEach(function (m) {
      if (m <= done || m > cur) return;
      var mm = milestoneMonth(m, g.targetAmount, g.initialAmount || 0, g.monthlyDeposit || 0, g.annualReturnPct || 0);
      var d = mm === null ? today : addMonths(parseISODate(g.startDate), mm);
      if (d > today) d = today;
      var n = { id: make(), goalId: g.id, goalName: g.name, type: m === 100 ? "achieved" : "milestone", date: toISODate(d), read: false };
      if (m !== 100) n.milestonePct = m;
      created.push(n);
    });
    if (g.notifiedMilestonePct === cur) return g;
    var ng = Object.assign({}, g, { notifiedMilestonePct: cur });
    changedGoals.push(ng);
    return ng;
  });
  created = sortNewestFirst(created.reverse()); /* higher milestone first on the same day */
  var all = sortNewestFirst(created.concat(existing));
  var dropped = all.slice(MAX_NOTIFICATIONS).map(function (n) { return n.id; });
  return { goals: out, changedGoals: changedGoals, created: created, notifications: all.slice(0, MAX_NOTIFICATIONS), dropped: dropped };
}

export function unreadCount(list) {
  return list.filter(function (n) { return !n.read; }).length;
}
/* Text on the bell badge: "" when nothing is unread, "9+" from ten. */
export function badgeText(count) {
  return count <= 0 ? "" : count >= 10 ? "9+" : String(count);
}

/* Sections for the list: today / yesterday / week (2 to 7 days ago) / older. Empty sections are left out. Keeps the given order inside a section. */
export function groupByDate(list, today) {
  var defs = [{ key: "today" }, { key: "yesterday" }, { key: "week" }, { key: "older" }];
  var buckets = { today: [], yesterday: [], week: [], older: [] };
  list.forEach(function (n) {
    var days = Math.round((today - parseISODate(n.date)) / 86400000);
    var key = days <= 0 ? "today" : days === 1 ? "yesterday" : days <= 7 ? "week" : "older";
    buckets[key].push(n);
  });
  return defs.filter(function (d) { return buckets[d.key].length; }).map(function (d) { return { key: d.key, items: buckets[d.key] }; });
}

export function markRead(list, id) {
  return list.map(function (n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; });
}
export function markAllRead(list) {
  return list.map(function (n) { return n.read ? n : Object.assign({}, n, { read: true }); });
}
export function removeForGoal(list, goalId) {
  return list.filter(function (n) { return n.goalId !== goalId; });
}
