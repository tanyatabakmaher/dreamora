import { CONFIG } from "./config.js";
import { S } from "./strings.js";
import { createAuth } from "./services/auth.js";
import { createGoalsRepo } from "./services/goalsRepo.js";
import { createAuthScreen } from "./components/AuthScreen.js";
import { createGoalsScreen } from "./components/GoalsScreen.js";

var root = document.getElementById("app");
var auth = createAuth(CONFIG);
var current = null;

function mount(screen) {
  if (current) current.destroy();
  current = screen;
  root.appendChild(screen.el);
  window.scrollTo(0, 0);
}
function showAuth(initialError) {
  mount(createAuthScreen({ auth: auth, demo: CONFIG.mode !== "supabase", initialError: initialError, onAuthed: showApp }));
}
function showApp() {
  mount(createGoalsScreen({
    repo: createGoalsRepo(CONFIG),
    onLogout: function () { auth.signOut().then(function () { showAuth(); }); }
  }));
}

/* An email link that was already used or has expired comes back with an error in the address. */
var linkError = null;
if (/error_code=otp_expired|error=access_denied/.test(window.location.hash)) {
  linkError = S["auth.err.linkUsed"];
  try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
}

if (linkError) showAuth(linkError);
else auth.getSession().then(function (s) { if (s) showApp(); else showAuth(); }).catch(function () { showAuth(); });
