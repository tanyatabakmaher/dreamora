/* Private / shared indicator data for a goal. Pure. Phase 1: nothing in the UI creates a shared goal; this is ready for when sharing is built.
   A goal without `visibility` is private. Shows at most two members, the rest are counted in `overflow`. */
export var MAX_SHOWN_MEMBERS = 2;
export function getShareIndicator(goal) {
  if (!goal || goal.visibility !== "shared") return { kind: "private" };
  var members = Array.isArray(goal.members) ? goal.members : [];
  return { kind: "shared", shown: members.slice(0, MAX_SHOWN_MEMBERS), overflow: Math.max(0, members.length - MAX_SHOWN_MEMBERS) };
}
/* The sharing part of a goal, kept in one place so the form (and later a sharing section) reads and writes it the same way.
   New goals are private. Editing keeps whatever the goal already has. */
export function sharingOf(goal) {
  return {
    visibility: goal && goal.visibility === "shared" ? "shared" : "private",
    members: goal && Array.isArray(goal.members) ? goal.members : []
  };
}
