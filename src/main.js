import { CONFIG } from "./config.js";
import { S } from "./strings.js";
import { createAuth } from "./services/auth.js";
import { createGoalsRepo } from "./services/goalsRepo.js";
import { createSharingApi } from "./services/sharingApi.js";
import { createNotificationsRepo } from "./services/notificationsRepo.js";
import { createAuthScreen } from "./components/AuthScreen.js";
import { showToast } from "./components/ui/Toast.js";
import { createGoalsScreen } from "./components/GoalsScreen.js";
import { createBudgetScreen } from "./components/BudgetScreen.js";
import { createBudgetDialog } from "./components/BudgetDialog.js";
import { createBudgetRepo } from "./services/budgetRepo.js";

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
  mount(createAuthScreen({ auth: auth, demo: CONFIG.mode !== "supabase", initialError: initialError, onAuthed: enter }));
}
function logout() {
  try { window.sessionStorage.removeItem("budget_prompted"); } catch (e) {}
  auth.signOut().then(function () { showAuth(); }).catch(function () { showToast(S["error.signOutFailed"]); });
}
function showApp() {
  mount(createGoalsScreen({
    repo: createGoalsRepo(CONFIG),
    notifRepo: createNotificationsRepo(CONFIG),
    sharing: createSharingApi(CONFIG), /* null in demo mode: invitations are never simulated locally */
    auth: auth,
    onBudget: showBudget,
    onLogout: logout
  }));
}

/* Right after sign-in: anyone with no budget yet (new or existing user) sees a "התקציב שלי" sheet over the goals once per browser session. */
function enter() {
  var seen = false;
  try { seen = window.sessionStorage.getItem("budget_prompted") === "1"; } catch (e) {}
  if (seen) { showApp(); return; }
  var repo = createBudgetRepo(CONFIG);
  repo.load().then(function (b) {
    try { window.sessionStorage.setItem("budget_prompted", "1"); } catch (e) {}
    if (b) showApp();
    else { showApp(); createBudgetDialog({ budgetRepo: repo, onDone: function () {} }).open(); }
  }).catch(function () { showApp(); });
}

function showBudget() {
  mount(createBudgetScreen({ repo: createGoalsRepo(CONFIG), budgetRepo: createBudgetRepo(CONFIG), auth: auth, notifRepo: createNotificationsRepo(CONFIG), sharing: createSharingApi(CONFIG), onLogout: logout, onBack: showApp }));
}

/* An email link that was already used or has expired comes back with an error in the address. */
var linkError = null;
if (/error_code=otp_expired|error=access_denied/.test(window.location.hash)) {
  linkError = S["auth.err.linkUsed"];
  try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
}

if (linkError) showAuth(linkError);
else auth.getSession().then(function (s) { if (s) enter(); else showAuth(); }).catch(function () { showAuth(); });
