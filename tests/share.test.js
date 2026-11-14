import { filterGoals, getShareIndicator, isShared, validateMemberEmail, diffMembers, hasChanges, permissionsOf, memberLabel } from "../src/lib/share.js";
import { ShareIndicator } from "../src/components/ShareIndicator.js";
import { groupSharing } from "../src/services/sharingApi.js";
import { NotificationItem } from "../src/components/NotificationsScreen.js";
let fail = 0;
function check(n, c, i) { if (!c) { fail++; console.log("FAIL", n, i ?? ""); } else console.log("ok  ", n); }
const m = (n) => ({ name: n });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
globalThis.document = undefined;
check("no members -> private", eq(getShareIndicator({}), { kind: "private" }));
check("legacy visibility shared without members -> private", eq(getShareIndicator({ visibility: "shared", members: [] }), { kind: "private" }));
check("legacy visibility private with members -> shared", getShareIndicator({ visibility: "private", members: [m("a")] }).kind === "shared");
check("1 member", eq(getShareIndicator({ members: [m("a")] }), { kind: "shared", shown: [m("a")], overflow: 0 }));
check("4 members", eq(getShareIndicator({ members: [m("a"), m("b"), m("c"), m("d")] }), { kind: "shared", shown: [m("a"), m("b")], overflow: 2 }));
check("isShared", isShared({ members: [m("a")] }) && !isShared({ members: [] }) && !isShared(undefined));
check("label name else email", memberLabel({ name: "דנה", email: "d@x.co" }) === "דנה" && memberLabel({ email: "d@x.co" }) === "d@x.co");
check("email invalid", validateMemberEmail("abc", [], "") === "invalid" && validateMemberEmail("a@b", [], "") === "invalid");
check("email duplicate case-insensitive", validateMemberEmail("A@B.co", [{ email: "a@b.co" }], "") === "duplicate");
check("email self", validateMemberEmail(" Me@x.co ", [], "me@x.co") === "self");
check("email ok", validateMemberEmail("ok@x.co", [{ email: "z@x.co" }], "me@x.co") === "");
const saved = [{ email: "a@x.co", role: "view" }, { email: "b@x.co", role: "edit" }];
const d = diffMembers(saved, [{ email: "a@x.co", role: "edit" }, { email: "N@x.co", role: "view" }]);
check("diff add/update/remove", eq(d, { add: [{ email: "n@x.co", role: "view" }], update: [{ email: "a@x.co", role: "edit" }], remove: ["b@x.co"] }), JSON.stringify(d));
check("no diff", !hasChanges(diffMembers(saved, saved)));
check("permissions", permissionsOf({ myRole: "view" }).canEdit === false && permissionsOf({ myRole: "edit" }).canDelete === false && permissionsOf({ myRole: "owner" }).canManageSharing && permissionsOf(null).canManageSharing);
const g = groupSharing([
  { goal_id: "g1", email: "o@x.co", name: "Owner", photo: null, role: "owner", status: "joined", is_me: false },
  { goal_id: "g1", email: null, name: "Me", photo: null, role: "edit", status: "joined", is_me: true },
  { goal_id: "g2", email: null, name: "Me", photo: null, role: "owner", status: "joined", is_me: true },
  { goal_id: "g2", email: "p@x.co", name: null, photo: "data:x", role: "view", status: "pending", is_me: false }]);
check("groupSharing excludes me and sets role", g.g1.myRole === "edit" && g.g1.members.length === 1 && g.g2.myRole === "owner" && g.g2.members[0].photoDataUrl === "data:x" && g.g2.members[0].status === "pending", JSON.stringify(g));
check("private markup label", /aria-label="פרטית"/.test(ShareIndicator({})));
const sh = ShareIndicator({ members: [m("דנה"), { email: "bob@x.co" }, m("c"), m("d")] });
check("shared label with more", /aria-label="משותפת עם דנה, bob@x.co ועוד 2"/.test(sh), sh);
check("shared shows +2 and initials", sh.includes("+2") && sh.includes(">ד<") && sh.includes(">B<"));
const req = { id: "n1", goalId: "g", goalName: "טיול", type: "shareRequest", date: "2026-11-14", read: false, payload: { fromName: "דנה", memberId: "m1", state: "pending" } };
const rq = NotificationItem(req);
check("request has accept/decline", rq.includes("nt-accept") && rq.includes("nt-decline") && rq.includes("אישור") && rq.includes("דחייה"), rq);
check("answered request has no buttons", !NotificationItem({ ...req, payload: { ...req.payload, state: "accepted" } }).includes("nt-accept") && NotificationItem({ ...req, payload: { ...req.payload, state: "accepted" } }).includes("אישרתם"));
const gl = [{ id: "a", members: [] }, { id: "b", members: [m("x")] }, { id: "c" }];
check("filter all", filterGoals(gl, "all").length === 3);
check("filter private", eq(filterGoals(gl, "private").map((g) => g.id), ["a", "c"]));
check("filter shared", eq(filterGoals(gl, "shared").map((g) => g.id), ["b"]));
console.log(fail === 0 ? "ALL PASSED" : fail + " FAILED"); process.exit(fail ? 1 : 0);
