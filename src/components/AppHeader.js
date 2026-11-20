import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { Avatar } from "./ui/Avatar.js";
import { HeaderLogo } from "./ui/Logo.js";
import { MenuIcon, LogoutIcon, BellIcon, WalletIcon, FlagIcon } from "./ui/Icons.js";
import { badgeText } from "../lib/notifications.js";
import { createMenu } from "./ui/Menu.js";

/* The purple brand bar, laid out for right-to-left: logo + wordmark at the start (right); at the end (left) the menu button (opens a dropdown from the right edge) then the logo; at the end (left): notifications bell with unread badge, a divider, then the profile (name and avatar, avatar on the outer edge, opens the profile).
   o.onProfile(openerEl), o.onNotifications(openerEl), o.onLogout(), o.onBudget() and o.onGoals() (optional), o.current = "goals" (default) | "budget": the menu marks that page. setUnread(count). setProfile({name, photo}) refreshes the avatar and name. */
export function createAppHeader(o) {
  var el = fromHTML('<div class="appbar"><div class="appbar-in">' +
    '<div class="appbar-start"><div class="menu-wrap"><button type="button" class="gear-btn" id="ah-settings" aria-label="' + esc(S["header.menuAria"]) + '">' + MenuIcon() + "</button></div>" +
    '<div class="appbar-brand">' + HeaderLogo({ height: 40 }) + "</div></div>" +
    '<div class="appbar-end">' +
    '<button type="button" class="bell-btn" id="ah-bell" aria-haspopup="dialog">' + BellIcon() + '<span class="bell-badge" id="ah-badge" hidden></span></button>' +
    '<span class="appbar-sep" aria-hidden="true"></span>' +
    '<button type="button" class="profile-btn" id="ah-profile" aria-label="' + esc(S["header.profileAria"]) + '"></button></div></div></div>');
  var profileBtn = el.querySelector("#ah-profile");
  var menu = createMenu({
    button: el.querySelector("#ah-settings"),
    items: [{ id: "goals", label: S["menu.goals"], icon: FlagIcon(), current: o.current !== "budget", onSelect: function () { if (o.current === "budget" && o.onGoals) o.onGoals(); } },
      { id: "budget", label: S["menu.budget"], icon: WalletIcon(), current: o.current === "budget", onSelect: function () { if (o.current !== "budget" && o.onBudget) o.onBudget(); } },
      { id: "logout", label: S["menu.logout"], icon: LogoutIcon(), danger: true, onSelect: function () { o.onLogout(); } }]
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
  /* The page title sticks right under this bar on phones (where the bar itself is fixed): it needs the bar's height. */
  function measure() { if (el.offsetHeight) document.documentElement.style.setProperty("--appbar-h", el.offsetHeight + "px"); }
  var ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  if (ro) ro.observe(el); else window.addEventListener("resize", measure);
  function setProfile(p) {
    profileBtn.innerHTML = '<span class="appbar-name">' + esc(p.name || "") + "</span>" + Avatar({ name: p.name || p.email, photo: p.photo });
  }
  setProfile({ name: "", photo: null });
  return { el: el, setProfile: setProfile, setUnread: setUnread, destroy: function () { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); menu.destroy(); el.remove(); } };
}
