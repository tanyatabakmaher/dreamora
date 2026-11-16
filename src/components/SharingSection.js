import { esc, fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { validateMemberEmail, memberLabel } from "../lib/share.js";
import { Avatar } from "./ui/Avatar.js";
import { UserPlusIcon, CloseIcon, LockIcon, UsersIcon, GlobeIcon, ShieldIcon } from "./ui/Icons.js";

/* Privacy and sharing card of the goal dialog: private / friends / public selector, then the member list when friends. Private and public both clear the draft member list (kept aside, so switching back to friends restores it). Public = readable by every signed-in user, view only. All changes are a draft held here; the dialog's save button reads getDraft() and applies it.
   o.ownEmail() -> the signed-in user's email. set(members, canManage) loads the saved members. getDraft() -> member list. setError(text). */
function roleSelect(value, label, disabled) {
  return '<select class="input sh-role" aria-label="' + esc(label) + '"' + (disabled ? " disabled" : "") + ">" +
    ["view", "edit"].map(function (r) { return '<option value="' + r + '"' + (r === value ? " selected" : "") + ">" + esc(S["share.role." + r]) + "</option>"; }).join("") + "</select>";
}
export function createSharingSection(o) {
  var el = fromHTML('<section class="sharing privacy-card" aria-labelledby="sh-title"><div class="sh-head">' + ShieldIcon() + '<h3 id="sh-title">' + S["share.title"] + "</h3></div>" +
    '<div class="seg" role="group" aria-labelledby="sh-title">' +
    '<button type="button" class="seg-opt" id="sh-opt-private" data-mode="private">' + LockIcon() + "<span>" + S["share.opt.private"] + "</span></button>" +
    '<button type="button" class="seg-opt" id="sh-opt-friends" data-mode="friends">' + UsersIcon() + "<span>" + S["share.opt.friends"] + "</span></button>" +
    '<button type="button" class="seg-opt" id="sh-opt-public" data-mode="public">' + GlobeIcon() + "<span>" + S["share.opt.public"] + "</span></button></div>" +
    '<div class="sh-explain" id="sh-explain" aria-live="polite"><span class="sh-explain-ico" id="sh-explain-ico"></span><div><div class="sh-explain-title" id="sh-explain-title"></div><div class="sh-explain-text" id="sh-explain-text"></div></div></div>' +
    '<div id="sh-body"><div id="sh-list" class="sh-list"></div>' +
    '<button type="button" class="linkbtn sh-link" id="sh-open"></button>' +
    '<div class="sh-add" id="sh-add" hidden><div class="sh-addrow"><input class="input sh-email" id="sh-email" type="email" dir="ltr" autocomplete="off" inputmode="email" aria-label="' + esc(S["share.addMember"]) + '" placeholder="' + esc(S["share.email.placeholder"]) + '">' +
    roleSelect("view", S["share.role.aria"], false).replace('class="input sh-role"', 'class="input sh-role" id="sh-newrole"') +
    '<button type="button" class="btn btn-primary sh-addbtn" id="sh-addbtn">' + S["share.add"] + "</button></div></div>" +
    '<div class="err" id="sh-err" role="alert"></div><p class="sh-help">' + S["share.help"] + "</p></div></section>");
  var $ = function (id) { return el.querySelector("#" + id); };
  var saved = [], draft = [], stash = [], canManage = true, adding = false, mode = "private", EXPLAIN_ICON = { private: LockIcon, friends: UsersIcon, public: GlobeIcon };

  function count() { return draft.length; }
  function render() {
    var shared = mode === "friends";
    ["private", "friends", "public"].forEach(function (m) {
      var b = $("sh-opt-" + m); b.setAttribute("aria-pressed", String(mode === m)); b.disabled = !canManage;
    });
    $("sh-explain-ico").innerHTML = EXPLAIN_ICON[mode]();
    $("sh-explain-title").textContent = S["share.explain." + mode + ".title"];
    $("sh-explain-text").textContent = S["share.explain." + mode];
    $("sh-explain").hidden = !canManage;
    $("sh-body").hidden = !shared;
    $("sh-list").innerHTML = draft.map(function (m, i) {
      var isNew = !saved.some(function (s) { return String(s.email || "").toLowerCase() === String(m.email || "").toLowerCase(); }) && m.role !== "owner";
      var status = m.role === "owner" ? S["share.role.owner"] : isNew ? S["share.status.draft"] : m.status === "joined" ? S["share.status.joined"] : S["share.status.pending"];
      var who = m.email || m.name || "";
      var roleCtl = m.role === "owner" || !canManage ? '<span class="sh-rolelabel">' + esc(S["share.role." + m.role]) + "</span>" : roleSelect(m.role, S["share.role.aria"] + " " + who, false);
      return '<div class="sh-row" data-i="' + i + '">' + Avatar({ photo: m.photoDataUrl, name: memberLabel(m), extraClass: "sh-avatar" }) +
        '<div class="sh-who"><div class="sh-email-txt" dir="ltr">' + esc(m.name && !m.email ? m.name : who) + '</div><div class="sh-status">' + esc(status) + "</div></div>" + roleCtl +
        (canManage && m.role !== "owner" ? '<button type="button" class="icon-btn sh-remove" aria-label="' + esc(S["share.remove"].replace("{email}", who)) + '">' + CloseIcon() + "</button>" : "") + "</div>";
    }).join("");
    var open = $("sh-open");
    open.hidden = !canManage;
    open.innerHTML = (draft.length === 0 ? UserPlusIcon() + " " + S["share.addMembers"] : UserPlusIcon() + " " + S["share.addMember"]);
    $("sh-add").hidden = !(canManage && adding);
    $("sh-open").hidden = !canManage || adding;
    el.querySelector(".sh-help").hidden = !canManage;
  }
  function add() {
    var email = $("sh-email").value;
    var bad = validateMemberEmail(email, draft, o.ownEmail());
    if (bad) { $("sh-err").textContent = S["share.error." + bad]; $("sh-email").setAttribute("aria-invalid", "true"); $("sh-email").focus(); return; }
    draft.push({ email: email.trim().toLowerCase(), role: $("sh-newrole").value, status: "pending" });
    $("sh-email").value = ""; $("sh-err").textContent = ""; $("sh-email").removeAttribute("aria-invalid");
    adding = false; render(); $("sh-open").focus();
  }
  el.querySelector(".seg").addEventListener("click", function (ev) {
    var b = ev.target.closest(".seg-opt");
    if (!b || !canManage || b.dataset.mode === mode) return;
    var keepsNoMembers = b.dataset.mode !== "friends";
    if (keepsNoMembers && mode === "friends") { stash = draft; draft = draft.filter(function (m) { return m.role === "owner"; }); adding = false; $("sh-err").textContent = ""; }
    else if (!keepsNoMembers) { draft = stash.length ? stash.concat(draft.filter(function (m) { return m.role === "owner"; })) : draft; stash = []; }
    mode = b.dataset.mode; render();
  });
  $("sh-open").addEventListener("click", function () { adding = true; $("sh-err").textContent = ""; render(); $("sh-email").focus(); });
  $("sh-addbtn").addEventListener("click", add);
  $("sh-email").addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); add(); } });
  $("sh-email").addEventListener("input", function () { $("sh-err").textContent = ""; this.removeAttribute("aria-invalid"); });
  $("sh-list").addEventListener("click", function (ev) {
    var b = ev.target.closest(".sh-remove"); if (!b) return;
    draft.splice(Number(b.closest(".sh-row").dataset.i), 1); render();
  });
  $("sh-list").addEventListener("change", function (ev) {
    var sel = ev.target.closest(".sh-role"); if (!sel) return;
    draft[Number(sel.closest(".sh-row").dataset.i)].role = sel.value;
  });
  return {
    el: el,
    set: function (members, manage, isPublic, preset) {
      saved = (members || []).map(function (m) { return Object.assign({}, m); });
      draft = saved.map(function (m) { return Object.assign({}, m); });
      canManage = manage; adding = false; stash = [];
      mode = isPublic ? "public" : draft.some(function (m) { return m.role !== "owner"; }) || !manage ? "friends" : "private";
      if (preset && manage && !draft.some(function (m) { return m.role !== "owner"; })) mode = preset; /* a new goal started from a filtered empty state opens with that privacy chosen */
      $("sh-email").value = ""; $("sh-err").textContent = "";
      render();
    },
    getDraft: function () { return draft.filter(function (m) { return m.role !== "owner"; }).map(function (m) { return Object.assign({}, m); }); },
    isPublic: function () { return mode === "public"; },
    getSaved: function () { return saved.filter(function (m) { return m.role !== "owner"; }); },
    setError: function (t) { $("sh-err").textContent = t || ""; }
  };
}
