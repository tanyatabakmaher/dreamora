/* Auth service. Same interface for both backends:
   getSession() -> {email}|null, signUp(name,email,pw), signIn(email,pw), signOut(), oauth(provider), magic(email)
   getProfile() -> {name,email,photo,phone}, updateProfile({name,photo,phone}) -> the saved profile.
   signUp/signIn resolve {session:boolean}. oauth/magic reject {demo:true} in demo mode. */
import { getClient } from "./supabaseClient.js";

var DEMO_KEY = "savings_demo_session_v1";
var DEMO_PROFILE_KEY = "savings_profile_v1";
function clean(p) {
  return { name: String(p.name || "").trim(), photo: p.photo || null, phone: String(p.phone || "").trim() };
}

function createDemoAuth() {
  var mem = null, api;
  function read() { try { return localStorage.getItem(DEMO_KEY); } catch (e) { return mem; } }
  function write(v) {
    try { if (v === null) localStorage.removeItem(DEMO_KEY); else localStorage.setItem(DEMO_KEY, v); } catch (e) {}
    mem = v;
  }
  api = {
    getSession: function () { var v = read(); return Promise.resolve(v ? JSON.parse(v) : null); },
    signUp: function (name, email) { write(JSON.stringify({ email: email, name: name })); return Promise.resolve({ session: true }); },
    signIn: function (email) { write(JSON.stringify({ email: email })); return Promise.resolve({ session: true }); },
    signOut: function () { write(null); return Promise.resolve(); },
    getProfile: function () {
      var s = read(); s = s ? JSON.parse(s) : {};
      var saved = {};
      try { saved = JSON.parse(localStorage.getItem(DEMO_PROFILE_KEY) || "{}"); } catch (e) {}
      return Promise.resolve({ name: saved.name || s.name || "", email: s.email || "", photo: saved.photo || null, phone: saved.phone || "" });
    },
    updateProfile: function (p) {
      var c = clean(p);
      try { localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(c)); }
      catch (e) { return Promise.reject({ storage: true }); }
      return api.getProfile();
    },
    oauth: function () { return Promise.reject({ demo: true }); },
    magic: function () { return Promise.reject({ demo: true }); }
  };
  return api;
}

function createSupabaseAuth(config) {
  var back = function () { return window.location.href.split("#")[0]; };
  function ok(r) { if (r.error) throw r.error; return r; }
  function client() { return getClient(config); }
  return {
    getSession: function () {
      return client().then(function (c) { return c.auth.getSession(); })
        .then(function (r) {
          var u = r.data.session && r.data.session.user;
          return u ? { email: u.email, name: (u.user_metadata && u.user_metadata.name) || "" } : null;
        });
    },
    getProfile: function () {
      return client().then(function (c) {
        return c.auth.getSession().then(function (r) {
          var u = r.data.session && r.data.session.user;
          if (!u) throw new Error("no session");
          return c.from("profiles").select("name,phone,photo").eq("id", u.id).maybeSingle().then(function (res) {
            if (res.error) throw res.error;
            var row = res.data || {};
            return { name: row.name || (u.user_metadata && u.user_metadata.name) || "", email: u.email, photo: row.photo || null, phone: row.phone || "" };
          });
        });
      });
    },
    updateProfile: function (p) {
      var cl = clean(p);
      return client().then(function (c) {
        return c.auth.getSession().then(function (r) {
          var u = r.data.session && r.data.session.user;
          if (!u) throw new Error("no session");
          return c.from("profiles").upsert({ id: u.id, name: cl.name || null, phone: cl.phone || null, photo: cl.photo }).then(function (res) {
            if (res.error) throw res.error;
            return { name: cl.name, email: u.email, photo: cl.photo, phone: cl.phone };
          });
        });
      });
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
