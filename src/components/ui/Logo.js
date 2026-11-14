import { esc } from "../../lib/dom.js";
import { S } from "../../strings.js";
/* Brand mark: a small dial with a dot on a tinted tile. */
export function Logo(o) {
  var size = (o && o.size) || 44, bg = (o && o.bg) || "#DCCCED";
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 56 56" role="img" aria-label="' + esc(S.logoLabel) + '">' +
    '<rect width="56" height="56" rx="16" fill="' + bg + '"/>' +
    '<path d="M12 38 A16 16 0 0 1 44 38" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M12 38 A16 16 0 0 1 32.9 22.8" fill="none" stroke="#70508F" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="32.9" cy="22.8" r="5" fill="#FFFFFF"/><circle cx="32.9" cy="22.8" r="3" fill="#70508F"/></svg>';
}
export function Brand() { return '<div class="brand">' + Logo({ size: 44 }) + "<b>" + esc(S.appName) + "</b></div>"; }
