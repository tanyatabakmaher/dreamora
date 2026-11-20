import { fromHTML } from "../lib/dom.js";
import { S } from "../strings.js";
import { Field, setFieldError } from "./ui/Field.js";
import { PasswordField, wirePasswordToggle } from "./ui/PasswordField.js";
import { Button, IconButton } from "./ui/Button.js";
import { Message, showMessage, hideMessage } from "./ui/Message.js";
import { BRAND_NAME } from "../brand.js";

/* Sign-in / sign-up form with a Google option. auth = auth service, demo = show the demo notice. */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Header collage: overlapping tilted picture cards covering the whole banner, the travel picture bigger in the middle. Positions are in design units (300 wide); CSS maps them with --u so it scales with the screen. */
var COLLAGE = ["laptop", "gym", "grad", "sprout", "gift", "car", "ring", "baby", "home"], COLLAGE_ROT = [-6, 4, -3, 6, -5, 3];
function collageHTML() {
  var h = "", n = 0;
  function card(img, c, r) {
    var off = r % 2 ? -50 : 0;
    h += '<img class="ac-card" loading="lazy" src="pics/welcome/collage/' + img + '.webp" alt="" style="left:calc(' + (c * 100 + off - 12) + ' * var(--u));top:calc(' + (-26 + r * 92) + ' * var(--u));transform:rotate(' + COLLAGE_ROT[n % COLLAGE_ROT.length] + 'deg);z-index:' + (1 + (n % 3)) + '">';
    n++;
  }
  [0, 1, 2, 3, -1, 4].forEach(function (c) { for (var r = 0; r < 3; r++) card(COLLAGE[(n * 4 + r) % COLLAGE.length], c, r); });
  /* two more rows below, only seen when the banner is tall (tall phones): the banner takes the height the form leaves */
  [0, 1, 2, 3, -1, 4].forEach(function (c) { for (var r = 3; r < 5; r++) card(COLLAGE[(n * 4 + r) % COLLAGE.length], c, r); });
  return h + '<img class="ac-card ac-center" src="pics/welcome/collage/travel.webp" alt="">';
}
export function createAuthForm(o) {
  /* Layout: a collage header of the three goal pictures (back button + Keepi logo over it) with the form sheet rising over its bottom edge. */
  var el = fromHTML('<section class="auth-view auth-form-view"><div class="auth-hero"><div class="auth-collage" aria-hidden="true"><div class="ac-stage">' + collageHTML() + '</div></div>' +
    '<img class="auth-hero-logo" src="pics/welcome/keepi-logo-dark.webp" alt="' + BRAND_NAME + '" width="720" height="241"></div>' +
    '<div class="auth-sheet"><div class="auth-handle" aria-hidden="true"></div>' +
    IconButton({ id: "af-back", label: S["auth.back.aria"], glyph: "✕" }).replace('class="icon-btn"', 'class="icon-btn auth-back"') +
    '<form class="auth-form" novalidate><div class="auth-sent-ic" id="af-sent-ic" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div><h2 id="af-title" tabindex="-1"></h2><p class="auth-sub" id="af-sub"></p><p class="auth-sent-text" id="af-sent-text" hidden></p>' +
    Message({ kind: "info", id: "af-demo", hidden: !o.demo }) +
    Field({ id: "af-name", label: S["auth.name"], attrs: 'autocomplete="name" maxlength="40" placeholder="' + S["auth.name.placeholder"] + '"' }) +
    Field({ id: "af-email", label: S["auth.email"], type: "email", attrs: 'autocomplete="email" dir="ltr" placeholder="name@example.com"' }) +
    PasswordField({ id: "af-pw", label: S["auth.password"], hint: S["auth.password.hint"] }) +
    Button({ id: "af-forgot", variant: "link", label: S["auth.forgot"], extraClass: "auth-forgot" }) +
    PasswordField({ id: "af-pw2", label: S["auth.password2"], autocomplete: "new-password" }) +
    Message({ kind: "error", id: "af-err" }) + Message({ kind: "info", id: "af-info" }) +
    Button({ id: "af-submit", type: "submit", label: "", block: true }) +
    '<div class="divider-or" id="af-or" aria-hidden="true">' + S["auth.or"] + "</div>" +
    '<div class="actions-stack" id="af-actions">' + Button({ id: "af-google", variant: "ghost", label: S["auth.google"], block: true }) + "</div>" +
    '<p class="fine" id="af-fine">' + S["auth.fine"] + "</p>" +
    '<p class="swap" id="af-swap-row"><span id="af-swap-text"></span>' + Button({ id: "af-swap", variant: "link", label: "" }) + "</p>" +
    '<p class="swap auth-sent-signup" id="af-sent-change" hidden>' + S["auth.sent.wrong"] + " " + Button({ id: "af-sent-ch", variant: "link", label: S["auth.sent.change"] }) + '</p>' +
    '<p class="swap auth-sent-signup" id="af-sent-signup" hidden>' + S["auth.sent.nohave"] + " " + Button({ id: "af-sent-su", variant: "link", label: S["auth.sent.signup"] }) + "</p></form></div></section>");
  var $ = function (id) { return el.querySelector("#" + id); };
  var mode = "login";
  wirePasswordToggle(el, "af-pw"); wirePasswordToggle(el, "af-pw2");
  if (o.demo) showMessage($("af-demo"), S["auth.demoNote"]);

  function clear() {
    setFieldError(el, "af-email", ""); setFieldError(el, "af-pw", ""); setFieldError(el, "af-pw2", "");
    hideMessage($("af-err")); hideMessage($("af-info"));
  }
  var sheet = el.querySelector(".auth-sheet"), sentEmail = "";
  function setMode(m) {
    var wasLogin = mode === "login" || mode === "signup", special = m === "reset" || m === "sent" || m === "newpw";
    /* reset / check-email keep the height the sheet had when it opened, so the popup does not shrink */
    if (special && wasLogin && sheet.offsetHeight) sheet.style.minHeight = sheet.offsetHeight + "px";
    if (!special) sheet.style.minHeight = "";
    mode = m; clear();
    el.dataset.mode = m;
    var su = m === "signup", rs = m === "reset", st = m === "sent", np = m === "newpw", cred = m === "login" || su;
    $("af-title").textContent = su ? S["auth.title.signup"] : rs ? S["auth.title.reset"] : st ? S["auth.title.sent"] : np ? S["auth.title.newpw"] : S["auth.title.login"];
    $("af-submit").textContent = su ? S["auth.signup"] : rs ? S["auth.reset.send"] : st ? S["auth.backToLogin"].replace("→ ", "") : np ? S["auth.newpw.save"] : S["auth.login"];
    $("af-sub").textContent = su ? S["auth.sub.signup"] : rs ? S["auth.sub.reset"] : np ? S["auth.sub.newpw"] : S["auth.sub.login"];
    $("af-sub").hidden = st;
    $("af-sent-signup").hidden = !st; $("af-sent-change").hidden = !st;
    $("af-sent-ic").hidden = !st; $("af-sent-text").hidden = !st;
    if (st) $("af-sent-text").textContent = S["auth.sent.text"].replace("{email}", sentEmail);
    $("af-name-field").hidden = !su; $("af-pw-hint").hidden = !(su || np);
    $("af-email-field").hidden = !(cred || rs);
    $("af-pw-field").hidden = !(cred || np);
    $("af-pw2-field").hidden = !(su || np);
    $("af-forgot").hidden = m !== "login";
    $("af-or").hidden = !cred; $("af-actions").hidden = !cred; $("af-fine").hidden = !cred;
    $("af-swap-row").hidden = false;
    $("af-demo").hidden = !(o.demo && cred);
    $("af-pw").setAttribute("autocomplete", su || np ? "new-password" : "current-password");
    $("af-pw").placeholder = su || np ? S["auth.password.hint"] : ""; /* phones hide the hint line below the field, the placeholder says the same */
    if (cred) {
      $("af-swap-text").textContent = su ? S["auth.haveAccount"] : S["auth.noAccount"];
      $("af-swap").textContent = su ? S["auth.login"] : S["auth.welcome.signup"];
    } else {
      $("af-swap-text").textContent = "";
      $("af-swap").textContent = st ? S["auth.sent.resend"] : S["auth.backToLogin"];
      $("af-swap-row").hidden = np;
    }
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
  $("af-swap").addEventListener("click", function () {
    if (mode === "sent") { sendReset(true); return; }
    setMode(mode === "login" ? "signup" : mode === "signup" ? "login" : "login"); $("af-title").focus();
  });
  $("af-sent-ch").addEventListener("click", function () { setMode("reset"); $("af-email").focus(); });
  $("af-sent-su").addEventListener("click", function () { setMode("signup"); $("af-title").focus(); });
  $("af-forgot").addEventListener("click", function () {
    /* the email is already typed in the sign-in form: send the link right away; otherwise ask for it */
    if (EMAIL_RE.test($("af-email").value.trim())) { sendReset(false); return; }
    setMode("reset"); $("af-title").focus();
  });
  function sendReset(again) {
    var email = again ? sentEmail : $("af-email").value.trim();
    if (!EMAIL_RE.test(email)) { setFieldError(el, "af-email", S["auth.err.email"]); return; }
    var btn = $("af-submit"); btn.disabled = true;
    o.auth.resetPassword(email).then(function () {
      sentEmail = email;
      if (again) { clear(); showMessage($("af-info"), S["auth.sent.resent"]); }
      else { setMode("sent"); $("af-title").focus(); }
    }).catch(function (e) { if (again) showMessage($("af-err"), friendly(e)); else altFail(e); })
      .then(function () { btn.disabled = false; });
  }
  el.querySelector("form").addEventListener("submit", function (ev) {
    ev.preventDefault(); clear();
    if (mode === "reset") { sendReset(false); return; }
    if (mode === "sent") { setMode("login"); $("af-title").focus(); return; }
    if (mode === "newpw") {
      var np1 = $("af-pw").value;
      if (np1.length < 8) { setFieldError(el, "af-pw", S["auth.err.pwShort"]); return; }
      if (np1 !== $("af-pw2").value) { setFieldError(el, "af-pw2", S["auth.err.pwMismatch"]); return; }
      var nb = $("af-submit"); nb.disabled = true;
      o.auth.updatePassword(np1).then(function () { $("af-pw").value = ""; $("af-pw2").value = ""; o.onAuthed(); })
        .catch(function (e) { showMessage($("af-err"), friendly(e)); }).then(function () { nb.disabled = false; });
      return;
    }
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
