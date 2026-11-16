import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { BRAND_NAME } from "../brand.js";
import { Button } from "./ui/Button.js";
/* First screen: the Keepi logo, a collage of goal pictures from the built-in catalog (display only, in pics/welcome/collage/), and the two entry buttons.
   Cards are [picture, left, top, size, tilt] in design units of a 262-wide stage; CSS scales them with --u. Nothing is clipped, so the edges of the pile stay uneven on all four sides. */
var CARDS = [["laptop", -6, 2, 92, -9, 3], ["home", 70, -14, 96, 4, 2], ["grad", 128, -6, 92, -6, 3], ["gym", 190, 8, 82, 8, 2],
  ["car", -6, 70, 92, 7, 2], ["gift", 178, 84, 88, -8, 3],
  ["sprout", -2, 138, 92, -5, 3], ["ring", 64, 146, 90, 5, 2], ["baby", 124, 142, 90, -6, 3], ["home", 176, 152, 80, 9, 2],
  ["travel", 64, 38, 142, -3, 9]];
function Card(c) {
  return '<img class="mc' + (c[0] === "travel" ? " mc-center" : "") + '" src="pics/welcome/collage/' + c[0] + '.webp" alt="" width="420" height="420" decoding="async" draggable="false" style="left:calc(' + c[1] + ' * var(--u));top:calc(' + c[2] + ' * var(--u));width:calc(' + c[3] + ' * var(--u));transform:rotate(' + c[4] + 'deg);z-index:' + c[5] + '">';
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
