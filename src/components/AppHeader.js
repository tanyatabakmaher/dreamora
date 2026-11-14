import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { BRAND_NAME } from "../brand.js";
import { Avatar } from "./ui/Avatar.js";
import { HeaderLogo } from "./ui/Logo.js";
import { GearIcon, LogoutIcon, BellIcon } from "./ui/Icons.js";
import { badgeText } from "../lib/notifications.js";
import { createMenu } from "./ui/Menu.js";

/* The purple brand bar: logo + wordmark at the start; at the end avatar (opens profile), notifications bell with unread badge, settings menu.
   o.onProfile(openerEl), o.onNotifications(openerEl), o.onLogout(). setUnread(count). setProfile({name, photo}) refreshes the avatar and name. */
export function createAppHeader(o) {
  var el = fromHTML('<div class="appbar"><div class="appbar-in">' +
    '<div class="appbar-brand">' + HeaderLogo({ size: 30 }) + '<span class="appbar-word">' + esc(BRAND_NAME) + "</span></div>" +
    '<div class="appbar-end"><button type="button" class="profile-btn" id="ah-profile" aria-label="' + esc(S["header.profileAria"]) + '"></button>' +
    '<button type="button" class="bell-btn" id="ah-bell" aria-haspopup="dialog">' + BellIcon() + '<span class="bell-badge" id="ah-badge" hidden></span></button>' +
    '<div class="menu-wrap"><button type="button" class="gear-btn" id="ah-settings" aria-label="' + esc(S["header.settingsAria"]) + '">' + GearIcon() + "</button></div></div></div></div>");
  var profileBtn = el.querySelector("#ah-profile");
  var menu = createMenu({
    button: el.querySelector("#ah-settings"),
    items: [{ id: "logout", label: S["menu.logout"], icon: LogoutIcon(), danger: true, onSelect: function () { o.onLogout(); } }]
  });
  el.querySelector(".menu-wrap").appendChild(menu.el);
  profileBtn.addEventListener("click", function () { o.onProfile(profileBtn); });
  var bell = el.querySelector("#ah-bell"), badge = el.querySelector("#ah-badge");
  bell.addEventListener("click", function () { o.onNotifications(bell); });
  function setUnread(count) {
    var txt = badgeText(count);
    badge.hidden = !txt; badge.textContent = txt;
    bell.setAttribute("aria-label", count > 0 ? S["header.notificationsAriaCount"].replace("{count}", String(count)) : S["header.notificationsAria"]);
  }
  setUnread(0);
  function setProfile(p) {
    profileBtn.innerHTML = Avatar({ name: p.name || p.email, photo: p.photo }) + '<span class="appbar-name">' + esc(p.name || "") + "</span>";
  }
  setProfile({ name: "", photo: null });
  return { el: el, setProfile: setProfile, setUnread: setUnread, destroy: function () { menu.destroy(); el.remove(); } };
}
