import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { BRAND_NAME } from "../brand.js";
import { Button } from "./ui/Button.js";
/* First screen ("goals mosaic"): the Keepi logo, three goal pictures from the built-in catalog (display only), and the two entry buttons.
   The big tile sits at the inline start (right in RTL), the two small ones are stacked at the inline end. Pictures are 720px copies of the originals in pics/. */
var TILES = [
  { cls: "mosaic-big", src: "pics/welcome/travel.webp", label: S["auth.welcome.tile.travel"] },
  { cls: "mosaic-top", src: "pics/welcome/home.webp", label: S["auth.welcome.tile.home"] },
  { cls: "mosaic-bottom", src: "pics/welcome/event.webp", label: S["auth.welcome.tile.event"] }
];
function Tile(t) {
  return '<div class="mosaic-tile ' + t.cls + '"><img src="' + t.src + '" alt="" width="720" height="720" decoding="async" draggable="false">' +
    '<span class="mosaic-label">' + esc(t.label) + "</span></div>";
}
export function createWelcome(o) {
  var el = fromHTML('<section class="auth-view welcome"><div class="auth-mid welcome-mid">' +
    '<img class="welcome-logo" src="pics/welcome/keepi-logo-dark.webp" alt="' + esc(BRAND_NAME) + '" width="720" height="241">' +
    '<div class="mosaic" aria-hidden="true">' + TILES.map(Tile).join("") + "</div>" +
    '<div><h2 id="wl-title" tabindex="-1">' + S["auth.welcome.title"] + "</h2><p>" + S["auth.welcome.subtitle"] + "</p></div></div>" +
    '<div class="welcome-divider" aria-hidden="true"></div>' +
    '<div class="actions-stack">' + Button({ id: "wl-signup", label: S["auth.welcome.signup"], block: true }) +
    Button({ id: "wl-login", variant: "ghost", label: S["auth.login"], block: true }) + "</div></section>");
  el.querySelector("#wl-signup").addEventListener("click", o.onSignup);
  el.querySelector("#wl-login").addEventListener("click", o.onLogin);
  return { el: el, focus: function () { el.querySelector("#wl-title").focus(); } };
}
