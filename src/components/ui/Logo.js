import { esc } from "../../lib/dom.js";
import { S } from "../../strings.js";
import { BRAND_NAME } from "../../brand.js";
/* Brand mark: a small dial with a dot on a tinted tile. */
export function Logo(o) {
  var size = (o && o.size) || 44, bg = (o && o.bg) || "#283B4B";
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 56 56" role="img" aria-label="' + esc(S.logoLabel) + '">' +
    '<rect width="56" height="56" rx="16" fill="' + bg + '"/>' +
    '<path d="M12 38 A16 16 0 0 1 44 38" fill="none" stroke="#385061" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M12 38 A16 16 0 0 1 32.9 22.8" fill="none" stroke="#78CEB2" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="32.9" cy="22.8" r="5" fill="#EBCB88"/><circle cx="32.9" cy="22.8" r="3" fill="#0C1722"/></svg>';
}
export function Brand() { return '<div class="brand">' + Logo({ size: 44 }) + "<b>" + esc(S.appName) + "</b></div>"; }
/* Header logo: the Keepi logo image (wordmark included), cropped and sized for the bar. Replace this one function to swap the logo. */
export function HeaderLogo(o) {
  var h = (o && o.height) || 40;
  return '<img class="appbar-logo" src="pics/keepi-logo-header.png" alt="' + esc(BRAND_NAME) + '" height="' + h + '">';
}
