/* Auth service. Same interface for both backends:
   getSession() -> {email}|null, signUp(name,email,pw), signIn(email,pw), signOut(), oauth(provider), magic(email)
   signUp/signIn resolve {session:boolean}. oauth/magic reject {demo:true} in demo mode. */
import { getClient } from "./supabaseClient.js";

var DEMO_KEY = "savings_demo_session_v1";

function createDemoAuth() {
  var mem = null;
  function read() { try { return localStorage.getItem(DEMO_KEY); } catch (e) { return mem; } }
  function write(v) {
    try { if (v === null) localStorage.removeItem(DEMO_KEY); else localStorage.setItem(DEMO_KEY, v); } catch (e) {}
    mem = v;
  }
  return {
    getSession: function () { var v = read(); return Promise.resolve(v ? JSON.parse(v) : null); },
    signUp: function (name, email) { write(JSON.stringify({ email: email, name: name })); return Promise.resolve({ session: true }); },
    signIn: function (email) { write(JSON.stringify({ email: email })); return Promise.resolve({ session: true }); },
    signOut: function () { write(null); return Promise.resolve(); },
    oauth: function () { return Promise.reject({ demo: true }); },
    magic: function () { return Promise.reject({ demo: true }); }
  };
}

function createSupabaseAuth(config) {
  var back = function () { return window.location.href.split("#")[0]; };
  function ok(r) { if (r.error) throw r.error; return r; }
  function client() { return getClient(config); }
  return {
    getSession: function () {
      return client().then(function (c) { return c.auth.getSession(); })
        .then(function (r) { return r.data.session ? { email: r.data.session.user.email } : null; });
    },
    signUp: function (name, email, pw) {
      return client().then(function (c) {
        return c.auth.signUp({ email: email, password: pw, options: { data: { name: name }, emailRedirectTo: back() } });
      }).then(ok).then(function (r) { return { session: !!r.data.session }; });
    },
    signIn: function (email, pw) {
      return client().then(function (c) { return c.auth.signInWithPassword({ email: email, password: pw }); })
        .then(ok).then(function () { return { session: true }; });
    },
    signOut: function () { return client().then(function (c) { return c.auth.signOut(); }); },
    oauth: function (provider) {
      return client().then(function (c) { return c.auth.signInWithOAuth({ provider: provider, options: { redirectTo: back() } }); }).then(ok);
    },
    magic: function (email) {
      return client().then(function (c) { return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: back() } }); }).then(ok);
    }
  };
}

export function createAuth(config) {
  return config.mode === "supabase" ? createSupabaseAuth(config) : createDemoAuth();
}
