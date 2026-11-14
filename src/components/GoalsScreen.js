import { fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { Button } from "./ui/Button.js";
import { showToast } from "./ui/Toast.js";
import { createGoalList } from "./GoalList.js";
import { createGoalForm } from "./GoalForm.js";
import { createConfirm } from "./ConfirmDialog.js";
import { createAppHeader } from "./AppHeader.js";
import { createProfileDialog } from "./ProfileDialog.js";
import { PlusIcon } from "./ui/Icons.js";

/* The main screen: brand bar, title row, goal list, goal form, profile dialog, delete confirmation.
   o.repo = goals storage, o.auth = auth service (getProfile / updateProfile), o.onLogout() */
export function createGoalsScreen(o) {
  var el = fromHTML('<div><div class="wrap"><div class="titlebar"><h1>' + S["home.title"] + "</h1>" +
    Button({ id: "gs-add", label: S["home.addGoal"], icon: PlusIcon(), extraClass: "add-btn" }) +
    '</div></div><footer class="foot">' + S["disclaimer"] + "</footer></div>");
  var profile = { name: "", email: "", photo: null, phone: "" };
  var profileDialog = createProfileDialog({
    save: function (p) { return o.auth.updateProfile(p); },
    onSaved: function (p) { profile = p; header.setProfile(p); }
  });
  var header = createAppHeader({
    onProfile: function (opener) { profileDialog.open(profile, opener); },
    onLogout: function () { o.onLogout(); }
  });
  el.insertBefore(header.el, el.firstChild);
  o.auth.getProfile().then(function (p) { profile = p; header.setProfile(p); }).catch(function () {});
  var goals = [];
  var list = createGoalList({
    onAdd: function (opener) { form.open(null, opener); },
    onEdit: function (g, opener) { if (g) form.open(g, opener); }
  });
  el.querySelector(".wrap").appendChild(list.el);
  var confirm = createConfirm({ title: S["delete.confirm.title"], body: S["delete.confirm.body"], yes: S["delete.confirm.yes"], no: S["delete.confirm.no"] });
  var form = createGoalForm({
    onSave: function (g) {
      var prev = goals.slice();
      var i = goals.findIndex(function (x) { return x.id === g.id; });
      if (i >= 0) goals[i] = g; else goals.push(g);
      list.render(goals);
      o.repo.save(g).catch(function (e) {
        goals = prev; list.render(goals); /* undo the optimistic change */
        showToast(e && e.storage ? S["error.storageFull"] : S["save.failed"]);
      });
    },
    onDelete: function (g, openerEl, closeForm) {
      confirm.ask(openerEl).then(function (yes) {
        if (!yes) return;
        goals = goals.filter(function (x) { return x.id !== g.id; });
        list.render(goals);
        closeForm();
        o.repo.remove(g.id).catch(function () { showToast(S["save.failed"]); });
      });
    }
  });
  el.querySelector("#gs-add").addEventListener("click", function () { form.open(null, this); });
  o.repo.load().then(function (l) { goals = l; })
    .catch(function () { goals = []; showToast(S["load.failed"]); })
    .then(function () { list.render(goals); });
  return { el: el, destroy: function () { form.destroy(); confirm.destroy(); profileDialog.destroy(); header.destroy(); el.remove(); } };
}
