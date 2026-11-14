/* Phone: optional. Digits, spaces, hyphens and one optional leading "+"; 9 to 13 digits. */
export function validPhone(value) {
  var v = String(value || "").trim();
  if (!v) return true;
  if (!/^\+?[0-9 -]+$/.test(v)) return false;
  var n = v.replace(/\D/g, "").length;
  return n >= 9 && n <= 13;
}
export function initialOf(name) {
  var s = String(name || "").trim();
  if (!s) return "?";
  return Array.from(s)[0].toUpperCase();
}
