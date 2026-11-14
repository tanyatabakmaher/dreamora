import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { fmtDate } from "../lib/format.js";
import { parseISODate } from "../lib/calc.js";
import { groupByDate } from "../lib/notifications.js";
import { createModal } from "./ui/Modal.js";
import { CloseIcon, BellIcon, GiftIcon, ConfettiIcon, UsersIcon } from "./ui/Icons.js";

/* Full notifications list, no filters. Sections by date, newest first; unread = purple dot + light background.
   o.onRespond(notification, accept) for share requests; o.onOpen(notification) when an item is pressed (the caller marks it read and shows the goal), o.onMarkAll(). open(list, today, openerEl, top) / update(list, today). */
var TYPES = {
  milestone: { icon: GiftIcon, tone: "milestone" },
  achieved: { icon: ConfettiIcon, tone: "achieved" },
  shareRequest: { icon: UsersIcon, tone: "share" }
};
function sentence(n, withMarkup) {
  var goal = withMarkup ? "<b>" + esc(n.goalName) + "</b>" : n.goalName;
  var tpl = n.type === "achieved" ? S["notif.achieved"] : n.type === "shareRequest" ? S["notif.shareRequest"] : S["notif.milestone"];
  var from = n.payload && n.payload.fromName ? (withMarkup ? esc(n.payload.fromName) : n.payload.fromName) : "";
  return tpl.replace("{pct}", String(n.milestonePct || "")).replace("{goal}", goal).replace("{from}", from);
}
export function NotificationItem(n) {
  var t = TYPES[n.type] || TYPES.milestone, date = fmtDate(parseISODate(n.date));
  var aria = (n.read ? "" : S["notif.unreadAria"] + ". ") + sentence(n, false) + ", " + date;
  var main = '<button type="button" class="nt-item' + (n.read ? "" : " unread") + '" data-id="' + esc(n.id) + '" aria-label="' + esc(aria) + '">' +
    '<span class="nt-icon nt-' + t.tone + '" aria-hidden="true">' + t.icon() + "</span>" +
    '<span class="nt-text"><span class="nt-sentence">' + sentence(n, true) + '</span><span class="nt-date num">' + date + "</span></span>" +
    (n.read ? "" : '<span class="nt-dot" aria-hidden="true"></span>') + "</button>";
  if (n.type !== "shareRequest" || !n.payload || !n.payload.memberId) return main;
  var st = n.payload.state || "pending", actions;
  if (st === "pending") {
    actions = '<button type="button" class="btn btn-primary nt-accept" data-id="' + esc(n.id) + '">' + S["notif.accept"] + "</button>" +
      '<button type="button" class="btn btn-ghost nt-decline" data-id="' + esc(n.id) + '">' + S["notif.decline"] + "</button>";
  } else actions = '<span class="nt-state">' + S[st === "accepted" ? "notif.accepted" : "notif.declined"] + "</span>";
  return '<div class="nt-row">' + main + '<div class="nt-actions">' + actions + "</div></div>";
}
export function createNotificationsScreen(o) {
  var sheet = fromHTML('<div class="sheet nt-sheet" role="dialog" aria-modal="true" aria-labelledby="nt-title">' +
    '<div class="nt-head"><h2 id="nt-title" tabindex="-1">' + S["notif.title"] + "</h2>" +
    '<button type="button" class="linkbtn nt-markall" id="nt-markall">' + S["notif.markAllRead"] + "</button>" +
    '<button type="button" class="icon-btn" id="nt-close" aria-label="' + esc(S["notif.close"]) + '">' + CloseIcon() + "</button></div>" +
    '<div class="nt-list" id="nt-list"></div></div>');
  var modal = createModal({ sheet: sheet, className: "overlay-notif" });
  var $ = function (id) { return sheet.querySelector("#" + id); };
  var current = [];
  function render(list, today) {
    current = list;
    $("nt-markall").hidden = !list.some(function (n) { return !n.read; });
    if (!list.length) {
      $("nt-list").innerHTML = '<div class="nt-empty">' + BellIcon() + "<h3>" + S["notif.empty.title"] + "</h3><p>" + S["notif.empty.subtitle"] + "</p></div>";
      return;
    }
    $("nt-list").innerHTML = groupByDate(list, today).map(function (g) {
      return '<section><h3 class="nt-section">' + S["notif.section." + g.key] + "</h3>" + g.items.map(NotificationItem).join("") + "</section>";
    }).join("");
  }
  $("nt-list").addEventListener("click", function (ev) {
    var r = ev.target.closest(".nt-accept, .nt-decline");
    if (r) {
      var rn = current.find(function (x) { return x.id === r.dataset.id; });
      if (rn && o.onRespond) { Array.prototype.forEach.call(r.parentNode.children, function (c) { c.disabled = true; }); o.onRespond(rn, r.classList.contains("nt-accept")); }
      return;
    }
    var b = ev.target.closest(".nt-item"); if (!b) return;
    var n = current.find(function (x) { return x.id === b.dataset.id; });
    if (n) o.onOpen(n);
  });
  $("nt-markall").addEventListener("click", function () { o.onMarkAll(); });
  $("nt-close").addEventListener("click", modal.close);
  return {
    open: function (list, today, opener, top) { render(list, today); modal.open(opener, "#nt-title", top); },
    update: function (list, today) { render(list, today); },
    close: modal.close,
    isOpen: modal.isOpen,
    destroy: function () { modal.destroy(); }
  };
}
