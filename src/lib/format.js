var nf = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
export function money(n) { return nf.format(Math.round(n)); }
export function fmtDate(d) {
  var p = function (x) { return String(x).padStart(2, "0"); };
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
}
export function durText(n) {
  var y = Math.floor(n / 12), m = n % 12, parts = [];
  if (y > 0) parts.push(y === 1 ? "שנה" : y === 2 ? "שנתיים" : y + " שנים");
  if (m > 0) parts.push(m === 1 ? "חודש" : m === 2 ? "חודשיים" : m + " חודשים");
  if (parts.length === 2) return parts[0] + " " + (/^\d/.test(parts[1]) ? "ו-" : "ו") + parts[1];
  return parts[0];
}
export function todayDate() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
