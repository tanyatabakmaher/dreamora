/* Sharing helpers. Pure.
   A goal is shared when it has members (people other than the signed-in user). The legacy `visibility` field is ignored.
   Member shape: { email?, name?, photoDataUrl?, role: "owner"|"edit"|"view", status: "pending"|"joined" }. */
export var MAX_SHOWN_MEMBERS = 2;
export function membersOf(goal) { return goal && Array.isArray(goal.members) ? goal.members : []; }
export function isShared(goal) { return membersOf(goal).length > 0; }
export function memberLabel(m) { return (m && (m.name || m.email)) || ""; }
/* Indicator data for the goal card: a lock, or the first two other participants and a count of the rest. */
export function getShareIndicator(goal) {
  var members = membersOf(goal);
  if (!members.length) return { kind: "private" };
  return { kind: "shared", shown: members.slice(0, MAX_SHOWN_MEMBERS), overflow: Math.max(0, members.length - MAX_SHOWN_MEMBERS) };
}
/* Validation for adding a member by email. Returns "" when fine, else "invalid" | "duplicate" | "self". */
export function validateMemberEmail(email, existing, ownEmail) {
  var e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) return "invalid";
  if (ownEmail && e === String(ownEmail).trim().toLowerCase()) return "self";
  var list = Array.isArray(existing) ? existing : [];
  for (var i = 0; i < list.length; i++) if (list[i] && String(list[i].email || "").toLowerCase() === e) return "duplicate";
  return "";
}
/* What changed between the saved members and the draft (both only people the owner invited). Matches by lowercase email. */
export function diffMembers(saved, draft) {
  var key = function (m) { return String(m.email || "").toLowerCase(); };
  var s = {}, d = {};
  (saved || []).forEach(function (m) { s[key(m)] = m; });
  (draft || []).forEach(function (m) { d[key(m)] = m; });
  return {
    add: (draft || []).filter(function (m) { return !s[key(m)]; }).map(function (m) { return { email: key(m), role: m.role }; }),
    update: (draft || []).filter(function (m) { return s[key(m)] && s[key(m)].role !== m.role; }).map(function (m) { return { email: key(m), role: m.role }; }),
    remove: (saved || []).filter(function (m) { return !d[key(m)]; }).map(key)
  };
}
export function hasChanges(diff) { return diff.add.length + diff.update.length + diff.remove.length > 0; }
/* Permissions as the UI uses them (the server enforces the real ones). */
export function permissionsOf(goal) {
  var role = goal && goal.myRole ? goal.myRole : "owner";
  return { role: role, canEdit: role === "owner" || role === "edit", canDelete: role === "owner", canManageSharing: role === "owner" };
}
/* Goal list filter: "all" | "private" | "shared". A goal is shared when it has members. */
export function filterGoals(goals, filter) {
  if (filter === "private") return goals.filter(function (g) { return !isShared(g); });
  if (filter === "shared") return goals.filter(isShared);
  return goals;
}
