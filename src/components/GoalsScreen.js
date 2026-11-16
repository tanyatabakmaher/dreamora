import { fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { Button } from "./ui/Button.js";
import { showToast } from "./ui/Toast.js";
import { createGoalList } from "./GoalList.js";
import { createGoalForm } from "./GoalForm.js";
import { createGoalPlanFlow } from "./GoalPlanFlow.js";
import { createGoalStartChooser } from "./GoalStartChooser.js";
import { createConfirm } from "./ConfirmDialog.js";
import { createAppHeader } from "./AppHeader.js";
import { createProfileDialog } from "./ProfileDialog.js";
import { PlusIcon } from "./ui/Icons.js";
import { createNotificationsScreen } from "./NotificationsScreen.js";
import { computeGoal, currentMilestone } from "../lib/calc.js";
import { todayDate } from "../lib/format.js";
import { migrateGoals, syncNotifications, unreadCount, markRead, markAllRead, removeForGoal } from "../lib/notifications.js";

/* The main screen: brand bar, title row, goal list, goal form, profile dialog, delete confirmation.
   o.repo = goals storage, o.notifRepo = notifications storage, o.sharing = sharing service or null (demo mode has no sharing), o.auth = auth service (getProfile / updateProfile), o.onLogout() */
export function createGoalsScreen(o) {
  var el = fromHTML('<div><div class="wrap"><div class="titlebar"><h1>' + S["home.title"] + "</h1>" +
    Button({ id: "gs-add", label: S["home.addGoal"], icon: PlusIcon(), extraClass: "add-btn" }) +
    '</div></div><footer class="foot">' + S["disclaimer"] + "</footer></div>");
  var profile = { name: "", email: "", photo: null, phone: "" };
  var profileDialog = createProfileDialog({
    save: function (p) { return o.auth.updateProfile(p); },
    onSaved: function (p) { profile = p; header.setProfile(p); list.render(goals); }
  });
  var notifications = [];
  var notifScreen = createNotificationsScreen({
    onOpen: function (n) {
      notifications = markRead(notifications, n.id); refreshBell();
      o.notifRepo.markRead(n.id).catch(function () { showToast(S["notif.failed"]); });
      notifScreen.close();
      if (n.goalId) setTimeout(function () { list.reveal(n.goalId); }, 60);
    },
    onRespond: function (n, accept) {
      if (!o.sharing) return;
      o.sharing.respond(n.id, accept).then(function (goalId) {
        notifications = notifications.map(function (x) {
          return x.id === n.id ? Object.assign({}, x, { read: true, payload: Object.assign({}, x.payload, { state: accept && goalId ? "accepted" : "declined" }) }) : x;
        });
        refreshBell(); notifScreen.update(notifications, todayDate());
        if (accept && goalId) reloadGoals().then(function () { notifScreen.close(); setTimeout(function () { list.reveal(goalId); }, 60); });
      }).catch(function () { showToast(S["notif.failed"]); notifScreen.update(notifications, todayDate()); });
    },
    onMarkAll: function () {
      notifications = markAllRead(notifications); refreshBell(); notifScreen.update(notifications, todayDate());
      o.notifRepo.markAllRead().catch(function () { showToast(S["notif.failed"]); });
    }
  });
  function refreshBell() { header.setUnread(unreadCount(notifications)); }
  /* Create notifications for milestones crossed since last time, and remember the highest one on each goal. Safe to run repeatedly. */
  function sync() {
    var today = todayDate(), res = syncNotifications(goals, notifications, today);
    goals = res.goals; notifications = res.notifications; refreshBell();
    res.changedGoals.forEach(function (g) { o.repo.save(g).catch(function () {}); });
    if (res.created.length) o.notifRepo.add(res.created).then(function () { return o.notifRepo.remove(res.dropped); }).catch(function () { showToast(S["notif.failed"]); });
  }
  var header = createAppHeader({
    onNotifications: function (opener) {
      if (notifScreen.isOpen()) { notifScreen.close(); return; }
      notifScreen.open(notifications, todayDate(), opener, Math.max(0, Math.round(header.el.getBoundingClientRect().bottom)));
    },
    onProfile: function (opener) { profileDialog.open(profile, opener); },
    onLogout: function () { o.onLogout(); }
  });
  el.insertBefore(header.el, el.firstChild);
  o.auth.getProfile().then(function (p) { profile = p; header.setProfile(p); if (typeof list !== "undefined") list.render(goals); }).catch(function () {});
  var goals = [];
  var list = createGoalList({
    canShare: function () { return !!o.sharing; },
    viewer: function () { return { name: profile.name, photo: profile.photo }; },
    onAdd: function (opener) { chooser.open(opener, opener.dataset.mode || null); },
    onEdit: function (g, opener) { if (g) form.open(g, opener); }
  });
  el.querySelector(".wrap").appendChild(list.el);
  var confirm = createConfirm({ title: S["delete.confirm.title"], body: S["delete.confirm.body"], yes: S["delete.confirm.yes"], no: S["delete.confirm.no"] });
  function reloadGoals() {
    return o.repo.load().then(function (g) { goals = g; list.render(goals); }).catch(function () {});
  }
  function saveGoal(g, diff) {
    var existing = goals.find(function (x) { return x.id === g.id; });
    if (existing) { g.members = existing.members || []; g.myRole = existing.myRole; }
    /* Progress that already exists when a goal is created or edited never produces notifications. */
    g.notifiedMilestonePct = currentMilestone(computeGoal(g, todayDate()).progressPct);
    var prev = goals.slice();
    var i = goals.findIndex(function (x) { return x.id === g.id; });
    if (i >= 0) goals[i] = g; else goals.push(g);
    list.render(goals);
    var saving = o.repo.save(g).catch(function (e) {
      goals = prev; list.render(goals); /* undo the optimistic change */
      showToast(e && e.storage ? S["error.storageFull"] : S["save.failed"]);
      throw e;
    });
    if (diff && o.sharing) {
      /* The goal is saved first, then the sharing changes; the dialog waits for both and stays open (draft kept) if sharing fails. */
      return saving.then(function () { return o.sharing.apply(g.id, diff); }).then(function () { return reloadGoals(); }).then(function () { sync(); });
    }
    saving.then(function () { sync(); }, function () {});
  }
  var form = createGoalForm({
    sharing: !!o.sharing,
    ownEmail: function () { return profile.email; },
    onSave: saveGoal,
    onDelete: function (g, openerEl, closeForm) {
      confirm.ask(openerEl).then(function (yes) {
        if (!yes) return;
        goals = goals.filter(function (x) { return x.id !== g.id; });
        notifications = removeForGoal(notifications, g.id); refreshBell();
        list.render(goals);
        closeForm();
        o.notifRepo.removeForGoal(g.id).catch(function () {});
        o.repo.remove(g.id).catch(function () { showToast(S["save.failed"]); });
      });
    }
  });
  /* Adding a goal starts with a choice: "know the deposit" continues to the existing form, "know the date" to the plan flow (which saves through the same saveGoal). */
  var planFlow = createGoalPlanFlow({ onSave: saveGoal });
  var chooser = createGoalStartChooser({
    onKnownDeposit: function (opener, mode) { form.open(null, opener, mode); },
    onKnownDate: function (opener) { planFlow.open(opener); }
  });
  el.querySelector("#gs-add").addEventListener("click", function () { chooser.open(this, null); });
  /* Invitations sent to this email before there was an account become notifications first, then everything loads. */
  (o.sharing ? o.sharing.syncRequests().catch(function () {}) : Promise.resolve()).then(function () { return Promise.all([
    o.repo.load().catch(function () { showToast(S["load.failed"]); return []; }),
    o.notifRepo.load().catch(function () { return []; })
  ]); }).then(function (r) {
    goals = r[0]; notifications = r[1];
    var mig = migrateGoals(goals, todayDate()); /* goals from before notifications: set silently, no history */
    goals = mig.goals;
    mig.changed.forEach(function (g) { o.repo.save(g).catch(function () {}); });
    list.render(goals);
    sync();
    /* Public goals of other users (random, up to 10) appear under the "public" filter; a failure just leaves them out. */
    if (o.repo.loadPublicOthers) o.repo.loadPublicOthers().then(function (others) { list.setOthers(others); }).catch(function () {});
  });
  /* With a server, new invitations and changes made by others appear when the person comes back to the app. */
  function onVisible() {
    if (document.visibilityState !== "visible" || form.isOpen() || !o.sharing) return;
    o.sharing.syncRequests().catch(function () {}).then(function () { return o.notifRepo.load(); })
      .then(function (n) { notifications = n; refreshBell(); if (notifScreen.isOpen()) notifScreen.update(notifications, todayDate()); }).catch(function () {});
    reloadGoals();
  }
  if (o.sharing) document.addEventListener("visibilitychange", onVisible);
  return { el: el, destroy: function () { document.removeEventListener("visibilitychange", onVisible); notifScreen.destroy(); chooser.destroy(); planFlow.destroy(); form.destroy(); confirm.destroy(); profileDialog.destroy(); header.destroy(); el.remove(); } };
}
