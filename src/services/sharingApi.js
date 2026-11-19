/* Sharing service (server side lives in supabase/005_sharing.sql; permissions are enforced there, the UI only reflects them).
   createSharingApi(config) -> null in demo mode (nothing is simulated locally), else:
     loadMembers(goalIds) -> Promise<{ [goalId]: { members: Member[], myRole } }>   members = everyone except the signed-in user
     apply(goalId, { add, update, remove }) -> Promise<void>
     respond(notificationId, accept) -> Promise<goalId|null>
     leave(goalId) -> Promise<void>
     syncRequests() -> Promise<number>   creates notifications for invitations sent to this email before the person had an account */
import { getClient } from "./supabaseClient.js";

function ok(r) { if (r.error) throw r.error; return r; }

export function groupSharing(rows) {
  var out = {};
  (rows || []).forEach(function (r) {
    var e = out[r.goal_id] || (out[r.goal_id] = { members: [], myRole: "view" });
    if (r.is_me) { e.myRole = r.role; return; }
    var m = { role: r.role, status: r.status };
    if (r.email) m.email = r.email;
    if (r.name) m.name = r.name;
    if (r.photo) m.photoDataUrl = r.photo;
    e.members.push(m);
  });
  Object.keys(out).forEach(function (id) {
    out[id].members.sort(function (a, b) { return (a.role === "owner" ? 0 : 1) - (b.role === "owner" ? 0 : 1); });
  });
  return out;
}

export function createSharingApi(config) {
  if (config.mode !== "supabase") return null;
  var client = function () { return getClient(config); };
  return {
    loadMembers: function (ids) {
      if (!ids.length) return Promise.resolve({});
      return client().then(function (c) { return c.rpc("list_goal_sharing", { p_goal_ids: ids }); }).then(ok).then(function (r) { return groupSharing(r.data); });
    },
    apply: function (goalId, d) {
      return client().then(function (c) { return c.rpc("apply_goal_sharing", { p_goal_id: goalId, p_add: d.add || [], p_update: d.update || [], p_remove: d.remove || [] }); }).then(ok).then(function () {});
    },
    respond: function (id, accept) {
      return client().then(function (c) { return c.rpc("respond_share_request", { p_notification_id: id, p_accept: !!accept }); }).then(ok).then(function (r) { return r.data || null; });
    },
    /* A participant leaves a shared goal; the owner gets a notification. */
    leave: function (goalId) {
      return client().then(function (c) { return c.rpc("leave_goal", { p_goal_id: goalId }); }).then(ok).then(function () {});
    },
    syncRequests: function () {
      return client().then(function (c) { return c.rpc("sync_share_requests"); }).then(ok).then(function (r) { return r.data || 0; });
    }
  };
}
