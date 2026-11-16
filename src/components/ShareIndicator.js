import { esc } from "../lib/dom.js";
import { initialOf } from "../lib/validate.js";
import { getShareIndicator, membersOf, memberLabel } from "../lib/share.js";
import { S } from "../strings.js";
import { LockIcon, UsersIcon, GlobeIcon } from "./ui/Icons.js";

/* Exposure marker in the top corner of a goal card: the same round icon on every card, only the glyph and its label change.
   Lock = private, people = shared, globe = public. The label is Hebrew text for screen readers (the shape differs too, so colour is never the only signal). */
export function ShareIndicator(goal) {
  var ind = getShareIndicator(goal);
  var glyph = ind.kind === "public" ? GlobeIcon() : ind.kind === "shared" ? UsersIcon() : LockIcon();
  var label = S["card.exposure." + ind.kind];
  return '<span class="share share-private" role="img" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + glyph + "</span>";
}

/* Who is shown on the goal picture. Returns null when there is nobody to show.
   { main, layers, extra }: main = the owner (the signed-in user's own profile for their goals); layers = up to two other participants (drawn behind);
   extra = participants other than the one fully visible (shown as "+N" only when above 0). viewer = { name, photo } of the signed-in user. */
export function getAvatarStack(goal, viewer) {
  viewer = viewer || {};
  var me = { name: viewer.name || "", photo: viewer.photo || "" };
  var mine = !goal.myRole || goal.myRole === "owner";
  /* Only people who accepted are drawn and counted; an invited-but-pending person still makes the goal "shared" (the icon), but has no avatar. */
  var members = membersOf(goal).filter(function (m) { return m.status === "joined"; }).map(function (m) { return { name: memberLabel(m), photo: m.photoDataUrl || "", owner: m.role === "owner" }; });
  if (goal.fromOthers) return { main: { name: goal.ownerName || "", photo: "" }, layers: [], extra: 0 };
  if (!members.length) return { main: mine ? me : { name: ownerOf(goal), photo: "" }, layers: [], extra: 0 };
  var all, main;
  if (mine) { main = me; all = members; }
  else { /* members come owner first, without the signed-in user; the owner is the full circle even if not "joined" yet */
    main = members.filter(function (m) { return m.owner; })[0] || { name: ownerOf(goal), photo: "" };
    all = members.filter(function (m) { return m !== main; }).concat([me]);
  }
  return { main: main, layers: all.slice(0, 2), extra: all.length };
}

function ownerOf(goal) {
  var o = membersOf(goal).filter(function (m) { return m.role === "owner"; })[0];
  return o ? memberLabel(o) : "";
}
function Dot(p, cls, tone) {
  var inner = p.photo ? '<img src="' + esc(p.photo) + '" alt="">' : esc(initialOf(p.name));
  return '<span class="pa ' + cls + (p.photo ? "" : " tone-" + tone) + '">' + inner + "</span>";
}
/* Avatars at the bottom-left corner of the goal picture: one full circle; behind it up to two thin crescents peeking inward; "+N" under the stack. */
export function AvatarStack(goal, viewer) {
  var st = getAvatarStack(goal, viewer);
  var names = [st.main.name].concat(st.layers.map(function (l) { return l.name; })).filter(Boolean).join(", ");
  var label = st.layers.length || st.extra ? S["card.participantsAria"].replace("{names}", names).replace("{count}", String(st.extra)) : S["card.ownerAria"].replace("{name}", st.main.name || "");
  var layers = st.layers.map(function (l, i) { return Dot(l, "pa-layer pa-l" + (i + 1), (i + 1) % 2); }).reverse().join("");
  return '<span class="pa-stack" role="img" aria-label="' + esc(label.trim()) + '"><span class="pa-row">' + layers + Dot(st.main, "pa-main", 0) + "</span>" +
    (st.extra > 0 ? '<span class="pa-count" aria-hidden="true">+' + st.extra + "</span>" : "") + "</span>";
}
