import { fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { Button } from "./ui/Button.js";
/* First screen: a preview of what the app shows, and the two entry buttons. */
function PreviewCard(name, pct, color) {
  return '<div class="pv-card"><span class="pv-dot" style="background:' + color + '"></span><div class="pv-mid"><span>' + name +
    '</span><div class="pv-bar"><i style="width:' + pct + '%"></i></div></div><span class="pv-pct num">' + pct + "%</span></div>";
}
export function createWelcome(o) {
  var el = fromHTML('<section class="auth-view"><div class="auth-mid"><div class="preview" aria-hidden="true">' +
    PreviewCard("טיול ליפן", 47, "#F3C6DA") + PreviewCard("רכב חדש", 13, "#CBE5EF") + PreviewCard("דירה", 72, "#C9E8DD") +
    '</div><div><h2 id="wl-title" tabindex="-1">' + S["auth.welcome.title"] + "</h2><p>" + S["auth.welcome.subtitle"] + "</p></div></div>" +
    '<div class="actions-stack">' + Button({ id: "wl-signup", label: S["auth.signup"], block: true }) +
    Button({ id: "wl-login", variant: "ghost", label: S["auth.login"], block: true }) + "</div></section>");
  el.querySelector("#wl-signup").addEventListener("click", o.onSignup);
  el.querySelector("#wl-login").addEventListener("click", o.onLogin);
  return { el: el, focus: function () { el.querySelector("#wl-title").focus(); } };
}
