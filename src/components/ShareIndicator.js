import { esc } from "../lib/dom.js";
import { initialOf } from "../lib/validate.js";
import { getShareIndicator } from "../lib/share.js";
import { S } from "../strings.js";
import { LockIcon } from "./ui/Icons.js";

/* Private / shared marker for a goal card header. Private: a lock in a grey circle. Shared: overlapping member avatars (up to two, then "+N").
   Always has an accessible label; lock versus avatars also differ by shape, so colour is never the only signal. */
function MemberAvatar(m, i) {
  var inner = m.photoDataUrl ? '<img src="' + esc(m.photoDataUrl) + '" alt="">' : esc(initialOf(m.name));
  return '<span class="mini-avatar tone-' + (i % 2) + '" aria-hidden="true">' + inner + "</span>";
}
export function ShareIndicator(goal) {
  var ind = getShareIndicator(goal);
  if (ind.kind === "private") {
    return '<span class="share share-private" role="img" aria-label="' + esc(S["card.private"]) + '">' + LockIcon() + "</span>";
  }
  var names = ind.shown.map(function (m) { return m.name; }).join(", ");
  if (ind.overflow > 0) names = S["card.sharedMore"].replace("{names}", names).replace("{count}", String(ind.overflow));
  var label = ind.shown.length ? S["card.sharedWithAria"].replace("{names}", names) : S["card.shared"];
  return '<span class="share share-shared" role="img" aria-label="' + esc(label) + '">' + ind.shown.map(MemberAvatar).join("") +
    (ind.overflow > 0 ? '<span class="mini-avatar more" aria-hidden="true">+' + ind.overflow + "</span>" : "") + "</span>";
}
