import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { BRAND_NAME } from "../brand.js";
import { Button } from "./ui/Button.js";
/* First screen: the Keepi logo, a collage of goal pictures from the built-in catalog (display only, in pics/welcome/collage/), and the two entry buttons.
   Cards are [picture, left, top, size, tilt] in design units of a 230-wide frame; CSS scales them with --u, and the frame clips them. */
var CARDS = [["home", -14, -6, 104, -8], ["laptop", 86, -14, 100, 5], ["grad", 178, -4, 100, -5], ["ring", -10, 92, 100, 6], ["sprout", 92, 90, 100, -4], ["gift", 176, 96, 100, 7], ["travel", 62, 34, 128, -2]];
function Card(c, i) {
  return '<img class="mc' + (c[0] === "travel" ? " mc-center" : "") + '" src="pics/welcome/collage/' + c[0] + '.webp" alt="" width="420" height="420" decoding="async" draggable="false" style="left:calc(' + c[1] + ' * var(--u));top:calc(' + c[2] + ' * var(--u));width:calc(' + c[3] + ' * var(--u));transform:rotate(' + c[4] + 'deg)">';
}
export function createWelcome(o) {
  var el = fromHTML('<section class="auth-view welcome"><div class="auth-mid welcome-mid">' +
    '<img class="welcome-logo" src="pics/welcome/keepi-logo-dark.webp" alt="' + esc(BRAND_NAME) + '" width="720" height="241">' +
    '<div class="mosaic" aria-hidden="true"><div class="mosaic-stage">' + CARDS.map(Card).join("") + "</div></div>" +
    '<div><h2 id="wl-title" tabindex="-1">' + S["auth.welcome.title"] + "</h2><p>" + S["auth.welcome.subtitle"] + "</p></div></div>" +
    '<div class="welcome-divider" aria-hidden="true"></div>' +
    '<div class="actions-stack">' + Button({ id: "wl-login", label: S["auth.login"], block: true }) +
    Button({ id: "wl-signup", variant: "ghost", label: S["auth.welcome.signup"], block: true }) + "</div></section>");
  el.querySelector("#wl-signup").addEventListener("click", o.onSignup);
  el.querySelector("#wl-login").addEventListener("click", o.onLogin);
  return { el: el, focus: function () { el.querySelector("#wl-title").focus(); } };
}
