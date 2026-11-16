import { fromHTML } from "../lib/dom.js";
import { Brand } from "./ui/Logo.js";
import { createWelcome } from "./Welcome.js";
import { createAuthForm } from "./AuthForm.js";

/* Welcome -> sign-in/sign-up. onAuthed() fires once a session exists. initialError opens sign-in with a message (e.g. used email link). */
export function createAuthScreen(o) {
  var el = fromHTML('<div class="auth">' + Brand() + "</div>");
  var brand = el.querySelector(".brand"); /* the welcome screen carries its own Keepi logo, so the small brand row is only for the form */
  var welcome = createWelcome({ onSignup: function () { open("signup"); }, onLogin: function () { open("login"); } });
  var form = createAuthForm({ auth: o.auth, demo: o.demo, onAuthed: o.onAuthed, onBack: function () { show("welcome"); } });
  el.appendChild(welcome.el); el.appendChild(form.el);
  function show(which) {
    welcome.el.hidden = which !== "welcome"; form.el.hidden = which !== "form"; brand.hidden = which === "welcome";
    (which === "welcome" ? welcome : form).focus();
  }
  function open(mode) { form.setMode(mode); show("form"); }
  show("welcome");
  if (o.initialError) { form.setMode("login"); welcome.el.hidden = true; form.el.hidden = false; brand.hidden = false; form.showError(o.initialError); }
  return { el: el, reset: function () { form.reset(); show("welcome"); }, destroy: function () { el.remove(); } };
}
