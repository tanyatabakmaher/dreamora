import { currentMilestone, milestoneMonth } from "../src/lib/calc.js";
import { syncNotifications, migrateGoals, unreadCount, badgeText, groupByDate, markRead, markAllRead, removeForGoal } from "../src/lib/notifications.js";
let fail = 0;
function check(n, c, i) { if (!c) { fail++; console.log("FAIL", n, i === undefined ? "" : JSON.stringify(i)); } else console.log("ok  ", n); }
const D = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = D("2026-11-14");
let c = 0; const newId = () => "n" + (++c);
const goal = (o) => Object.assign({ id: "g1", name: "טיול", emoji: "✈️", targetAmount: 12000, initialAmount: 2000, monthlyDeposit: 500, trackId: "custom", annualReturnPct: 0, startDate: "2026-06-14", createdAt: "x" }, o);

// current milestone
check("current 0%", currentMilestone(0) === 0);
check("current 49%", currentMilestone(49) === 25);
check("current 50%", currentMilestone(50) === 50);
check("current 100%", currentMilestone(100) === 100);
// milestone months (spec vectors)
check("mm 25 = 2", milestoneMonth(25, 12000, 2000, 500, 0) === 2);
check("mm 50 = 8", milestoneMonth(50, 12000, 2000, 500, 0) === 8);
check("mm 100 = 20", milestoneMonth(100, 12000, 2000, 500, 0) === 20);
check("mm 25 already covered = 0", milestoneMonth(25, 10000, 3000, 500, 0) === 0);

// one crossed milestone
let r = syncNotifications([goal({ notifiedMilestonePct: 0 })], [], today, { newId });
check("37.5% -> one milestone", r.created.length === 1 && r.created[0].type === "milestone" && r.created[0].milestonePct === 25, r.created);
check("date is milestone date", r.created[0].date === "2026-08-14", r.created[0]);
check("goal updated to 25", r.changedGoals.length === 1 && r.changedGoals[0].notifiedMilestonePct === 25);
check("unread by default", r.created[0].read === false && r.created[0].goalName === "טיול");
// idempotent
let r2 = syncNotifications(r.goals, r.notifications, today, { newId });
check("idempotent", r2.created.length === 0 && r2.changedGoals.length === 0 && r2.notifications.length === 1);

// several milestones at once, achieved is its own type
r = syncNotifications([goal({ startDate: "2025-01-14", notifiedMilestonePct: 0 })], [], today, { newId });
check("four notifications", r.created.length === 4, r.created.map((n) => n.type + n.milestonePct));
const ach = r.created.filter((n) => n.type === "achieved");
check("single achieved, no pct", ach.length === 1 && ach[0].milestonePct === undefined && r.created.filter((n) => n.milestonePct === 100).length === 0);
check("newest first", r.notifications.every((n, i, a) => i === 0 || a[i - 1].date >= n.date), r.notifications.map((n) => n.date));
check("achieved date 2026-09-14", ach[0].date === "2026-09-14", ach[0]);
// never for milestones already notified
r = syncNotifications([goal({ startDate: "2025-01-14", notifiedMilestonePct: 50 })], [], today, { newId });
check("only 75 and achieved after 50", r.created.length === 2 && r.created.every((n) => n.milestonePct !== 25 && n.milestonePct !== 50), r.created.map((n) => n.type + n.milestonePct));
// missing field treated as 0 by sync, but migration is silent
const old = goal({ startDate: "2025-01-14" });
const mig = migrateGoals([old], today);
check("migration sets field silently", mig.goals[0].notifiedMilestonePct === 100 && mig.changed.length === 1);
check("migrated goal produces nothing", syncNotifications(mig.goals, [], today, { newId }).created.length === 0);
check("migration leaves set fields", migrateGoals([goal({ notifiedMilestonePct: 25 })], today).changed.length === 0);
// date capped at today
r = syncNotifications([goal({ initialAmount: 3000, targetAmount: 10000, startDate: "2026-11-14", notifiedMilestonePct: 0 })], [], today, { newId });
check("covered at start: date = today", r.created.length === 1 && r.created[0].date === "2026-11-14", r.created);
// trimming to 50
const many = Array.from({ length: 60 }, (_, i) => ({ id: "e" + i, goalId: "z", goalName: "z", type: "milestone", milestonePct: 25, date: "2026-0" + (1 + (i % 9)) + "-01", read: true }));
r = syncNotifications([], many, today, { newId });
check("trimmed to 50", r.notifications.length === 50 && r.dropped.length === 10);
check("oldest dropped", r.notifications.every((n) => n.date >= "2026-01-01") && r.dropped.every((id) => !r.notifications.find((n) => n.id === id)));

// badge
const mk = (read) => ({ id: "x" + Math.random(), goalId: "g", goalName: "g", type: "achieved", date: "2026-11-14", read });
check("unread counts only unread", unreadCount([mk(false), mk(true), mk(false)]) === 2);
check("badge hidden at 0", badgeText(0) === "");
check("badge 9", badgeText(9) === "9");
check("badge 9+ at 10", badgeText(10) === "9+" && badgeText(30) === "9+");
// grouping
const at = (d, id) => ({ id, goalId: "g", goalName: "g", type: "achieved", date: d, read: false });
const groups = groupByDate([at("2026-11-14", "a"), at("2026-11-13", "b"), at("2026-11-12", "e"), at("2026-11-07", "c"), at("2026-11-06", "d")], today);
check("sections order", groups.map((g) => g.key).join() === "today,yesterday,week,older", groups.map((g) => g.key));
check("week = 2..7 days", groups[2].items.map((n) => n.id).join() === "e,c", groups[2].items.map((n) => n.id));
check("empty sections hidden", groupByDate([at("2026-11-14", "a")], today).length === 1);
// read state and removal
let l = [mk(false), mk(false)]; l[0].id = "p"; l[1].id = "q";
check("mark one read", markRead(l, "p")[0].read === true && markRead(l, "p")[1].read === false);
check("mark all read", markAllRead(l).every((n) => n.read));
check("remove for goal", removeForGoal([{ goalId: "a" }, { goalId: "b" }], "a").length === 1);
// rendering (shareRequest is prepared for the sharing phase)
import { NotificationItem } from "../src/components/NotificationsScreen.js";
const sr = NotificationItem({ id: "s1", goalId: null, goalName: "טיול", type: "shareRequest", date: "2026-11-14", read: false, payload: { fromName: "דנה" } });
check("share request text", sr.includes("בקשה למטרה משותפת <b>טיול</b> מאת דנה"), sr);
check("unread aria prefix", /aria-label="לא נקראה\. בקשה למטרה משותפת טיול מאת דנה, 14\/11\/2026"/.test(sr), sr);
check("unread dot present", sr.includes("nt-dot"));
const ms = NotificationItem({ id: "m1", goalId: "g", goalName: "<b>x</b>", type: "milestone", milestonePct: 50, date: "2026-11-14", read: true });
check("goal name escaped, no dot when read", ms.includes("&lt;b&gt;x&lt;/b&gt;") && !ms.includes("nt-dot") && ms.includes("הגעתם ל-50% במטרה"));
console.log(fail === 0 ? "ALL PASSED" : fail + " FAILED"); process.exit(fail ? 1 : 0);
