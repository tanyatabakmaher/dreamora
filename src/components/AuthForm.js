import { fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { Field, setFieldError } from "./ui/Field.js";
import { PasswordField, wirePasswordToggle } from "./ui/PasswordField.js";
import { Button } from "./ui/Button.js";
import { Message, showMessage, hideMessage } from "./ui/Message.js";
import { BRAND_NAME } from "../brand.js";

/* Sign-in / sign-up form with a Google option. auth = auth service, demo = show the demo notice. */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAuthForm(o) {
  /* Layout: a picture header (back button + Keepi logo) with the form sheet rising over its bottom edge. */
  var el = fromHTML('<section class="auth-view auth-form-view"><div class="auth-hero">' +
    Button({ id: "af-back", variant: "ghost", label: S["auth.back"], extraClass: "auth-back", attrs: 'aria-label="חזרה"' }) +
    '<img class="auth-hero-logo" src="pics/welcome/keepi-logo-dark.webp" alt="' + BRAND_NAME + '" width="720" height="241"></div>' +
    '<div class="auth-sheet"><div class="auth-handle" aria-hidden="true"></div>' +
    '<form class="auth-form" novalidate><h2 id="af-title" tabindex="-1"></h2><p class="auth-sub" id="af-sub"></p>' +
    Message({ kind: "info", id: "af-demo", hidden: !o.demo }) +
    Field({ id: "af-name", label: S["auth.name"], attrs: 'autocomplete="name" maxlength="40" placeholder="' + S["auth.name.placeholder"] + '"' }) +
    Field({ id: "af-email", label: S["auth.email"], type: "email", attrs: 'autocomplete="email" dir="ltr" placeholder="name@example.com"' }) +
    PasswordField({ id: "af-pw", label: S["auth.password"], hint: S["auth.password.hint"] }) +
    PasswordField({ id: "af-pw2", label: S["auth.password2"], autocomplete: "new-password" }) +
    Message({ kind: "error", id: "af-err" }) + Message({ kind: "info", id: "af-info" }) +
    Button({ id: "af-submit", type: "submit", label: "", block: true }) +
    '<div class="divider-or" aria-hidden="true">' + S["auth.or"] + "</div>" +
    '<div class="actions-stack">' + Button({ id: "af-google", variant: "ghost", label: S["auth.google"], block: true }) + "</div>" +
    '<p class="fine" id="af-fine">' + S["auth.fine"] + "</p>" +
    '<p class="swap"><span id="af-swap-text"></span>' + Button({ id: "af-swap", variant: "link", label: "" }) + "</p></form></div></section>");
  var $ = function (id) { return el.querySelector("#" + id); };
  var mode = "login";
  wirePasswordToggle(el, "af-pw"); wirePasswordToggle(el, "af-pw2");
  if (o.demo) showMessage($("af-demo"), S["auth.demoNote"]);

  function clear() {
    setFieldError(el, "af-email", ""); setFieldError(el, "af-pw", ""); setFieldError(el, "af-pw2", "");
    hideMessage($("af-err")); hideMessage($("af-info"));
  }
  function setMode(m) {
    mode = m; clear();
    var su = m === "signup";
    $("af-title").textContent = su ? S["auth.title.signup"] : S["auth.title.login"];
    $("af-submit").textContent = su ? S["auth.signup"] : S["auth.login"];
    $("af-sub").textContent = su ? S["auth.sub.signup"] : S["auth.sub.login"];
    $("af-name-field").hidden = !su; $("af-pw-hint").hidden = !su; $("af-pw2-field").hidden = !su;
    $("af-pw").setAttribute("autocomplete", su ? "new-password" : "current-password");
    $("af-swap-text").textContent = su ? S["auth.haveAccount"] : S["auth.noAccount"];
    $("af-swap").textContent = su ? S["auth.login"] : S["auth.welcome.signup"];
  }
  function friendly(e) {
    var m = ((e && e.message) || "").toLowerCase();
    if (m.indexOf("invalid login") > -1) return S["auth.err.invalid"];
    if (m.indexOf("already") > -1) return S["auth.err.exists"];
    if (m.indexOf("rate") > -1) return S["auth.err.rate"];
    return S["auth.err.generic"];
  }
  function altFail(e) {
    if (e && e.demo) showMessage($("af-info"), S["auth.info.demoOnly"]);
    else showMessage($("af-err"), friendly(e));
  }

  $("af-back").addEventListener("click", o.onBack);
  $("af-swap").addEventListener("click", function () { setMode(mode === "login" ? "signup" : "login"); $("af-title").focus(); });
  el.querySelector("form").addEventListener("submit", function (ev) {
    ev.preventDefault(); clear();
    var email = $("af-email").value.trim(), pw = $("af-pw").value, name = $("af-name").value.trim(), ok = true;
    if (!EMAIL_RE.test(email)) { setFieldError(el, "af-email", S["auth.err.email"]); ok = false; }
    if (!pw) { setFieldError(el, "af-pw", S["auth.err.pwRequired"]); ok = false; }
    else if (mode === "signup" && pw.length < 8) { setFieldError(el, "af-pw", S["auth.err.pwShort"]); ok = false; }
    if (mode === "signup" && pw && pw !== $("af-pw2").value) { setFieldError(el, "af-pw2", S["auth.err.pwMismatch"]); ok = false; }
    if (!ok) return;
    var btn = $("af-submit"); btn.disabled = true;
    (mode === "signup" ? o.auth.signUp(name, email, pw) : o.auth.signIn(email, pw)).then(function (r) {
      if (r && r.session) { $("af-pw").value = ""; $("af-pw2").value = ""; o.onAuthed(); }
      else showMessage($("af-info"), S["auth.info.confirmEmail"]);
    }).catch(function (e) { showMessage($("af-err"), friendly(e)); })
      .then(function () { btn.disabled = false; });
  });
  $("af-google").addEventListener("click", function () { clear(); o.auth.oauth("google").catch(altFail); });


  setMode("login");
  return {
    el: el, setMode: setMode,
    focus: function () { $("af-title").focus(); },
    reset: function () { el.querySelector("form").reset(); setMode("login"); },
    showError: function (text) { showMessage($("af-err"), text); }
  };
}
