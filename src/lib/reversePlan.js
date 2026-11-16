/* "How much to deposit?" calculation per investment track. Pure: no UI, no storage.
   planRows(T, P, n, edits) returns one row per track in TRACKS order:
   { id, gross, fee, net, deposit, status, barPct, edited, defaultDeposit }
   - gross / fee are the track defaults unless edits[id] = { ret, fee } overrides them (a goal-only edit; defaults never change).
   - deposit is the whole-shekel monthly deposit that reaches T in n months, or null when gross / fee are missing or out of range (the custom track starts empty).
   - barPct is deposit relative to the largest deposit among all rows (the most expensive track is 100, the rest are proportional from zero). */
import { TRACKS } from "../data/tracks.js";
import { netReturnPct, requiredDeposit } from "./calc.js";

function numOrNull(v) { return v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v); }
function valid(ret, fee) { return ret !== null && fee !== null && ret >= 0 && ret <= 100 && fee >= 0 && fee <= 10; }

export function planRows(T, P, n, edits) {
  var rows = TRACKS.map(function (t) {
    var e = (edits && edits[t.id]) || {};
    var ret = "ret" in e ? numOrNull(e.ret) : numOrNull(t.defaultReturnPct);
    var fee = "fee" in e ? (e.fee === "" ? 0 : numOrNull(e.fee)) : numOrNull(t.defaultFeePct);
    var ok = valid(ret, fee), net = ok ? netReturnPct(ret, fee) : null;
    var res = ok ? requiredDeposit(T, P, net, n) : null;
    var defNet = numOrNull(t.defaultReturnPct) === null ? null : netReturnPct(t.defaultReturnPct, t.defaultFeePct);
    var def = defNet === null ? null : requiredDeposit(T, P, defNet, n);
    return { id: t.id, gross: ret, fee: fee, net: net, deposit: res ? res.deposit : null, status: res ? res.status : "incomplete",
      barPct: 0, edited: ("ret" in e) || ("fee" in e), defaultDeposit: def ? def.deposit : null };
  });
  var max = rows.reduce(function (m, r) { return r.deposit !== null && r.deposit > m ? r.deposit : m; }, 0);
  rows.forEach(function (r) { r.barPct = max > 0 && r.deposit !== null ? Math.round(r.deposit / max * 1000) / 10 : 0; });
  return rows;
}
