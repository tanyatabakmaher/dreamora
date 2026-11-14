import { esc } from "../../lib/dom.js";
import { initialOf } from "../../lib/validate.js";
/* Round avatar: the photo if there is one, otherwise the first letter of the name. Size and font come from CSS (.avatar). */
export function Avatar(o) {
  var inner = o.photo ? '<img src="' + esc(o.photo) + '" alt="">' : '<span class="avatar-letter" aria-hidden="true">' + esc(initialOf(o.name)) + "</span>";
  return '<span class="avatar' + (o.extraClass ? " " + o.extraClass : "") + '">' + inner + "</span>";
}
