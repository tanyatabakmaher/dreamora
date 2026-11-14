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
/* Header mark (placeholder for the final Dreamora logo): white tile with a moon and stars. Replace this one function to swap the logo. */
export function HeaderLogo(o) {
  var size = (o && o.size) || 30;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="9" fill="#FFFFFF"/>' +
    '<path d="M18.5 8.2a7.2 7.2 0 1 0 3.3 12.6A6 6 0 0 1 18.5 8.2z" fill="#70508F"/>' +
    '<path d="M21.5 7l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="#70508F"/><circle cx="23.5" cy="14" r="1" fill="#70508F"/></svg>';
}
