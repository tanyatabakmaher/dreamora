import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { money, todayDate } from "../lib/format.js";
import { summarize } from "../lib/budget.js";
import { PencilIcon } from "./ui/Icons.js";

/* A short budget overview above the goal list: how the money and the monthly saving compare with what the goals need.
   Outer ring = the starting amounts (money you have vs. what the goals start with), inner ring = the monthly deposits (saving vs. deposits).
   Wide screens show two short rows; narrow screens show a headline and two rows with a bar each. o.budgetRepo, o.onOpen(openerEl). update(goals) re-renders. */
function fill(t, vars) { return Object.keys(vars).reduce(function (s, k) { return s.split("{" + k + "}").join(vars[k]); }, t); }
function pct(used, avail) { return avail > 0 ? Math.max(0, Math.min(100, used / avail * 100)) : (used > 0 ? 100 : 0); }

/* rings show what is left of what is available: full when nothing is allocated, empty when used up or over (same as the goal form panel) */
function left(avail, used) { return avail > 0 ? Math.max(0, Math.min(100, (avail - used) / avail * 100)) : 0; }

function rings(pi, pm, size, sw, gid) {
  var h = size / 2, r1 = (size - sw) / 2, r2 = r1 - sw - 4;
  function arc(r, p, g) {
    var c = 2 * Math.PI * r;
    return '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" class="bs-track" stroke-width="' + sw + '"/>' +
      '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" class="bs-r-' + g + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + (c * p / 100).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 ' + h + " " + h + ')"/>';
  }
  return '<svg class="bs-rings" viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' + arc(r1, pi, "i") + arc(r2, pm, "m") + "</svg>";
}
/* How much is still free: "left X of Y"; when the goals use more than there is, "allocated X of Y" (the gap itself is shown in red next to it). */
function leftLine(have, need) {
  return need <= have ? fill(S["bs.leftOf"], { left: money(have - need), have: money(have) }) : fill(S["bs.have"], { have: money(have), need: money(need) });
}
/* The goals on a line: up to three mini polaroids hanging from a thin gold string (first goal at the start side), a "+N" polaroid for the rest, and the count. */
function pins(goals) {
  if (!goals.length) return "";
  var shown = goals.slice(0, 3), more = goals.length - shown.length, tilt = [-3, 2, -2, 2];
  var pol = shown.map(function (g, i) {
    var pic = g.image ? '<img src="' + esc(g.image) + '" alt="" loading="lazy" decoding="async">' : '<span class="bs-emoji">' + esc(g.emoji || "🎯") + "</span>";
    return '<span class="bs-pin" style="--t:' + tilt[i] + 'deg"><span class="bs-pol">' + pic + "</span></span>";
  }).join("") + (more > 0 ? '<span class="bs-pin" style="--t:' + tilt[3] + 'deg"><span class="bs-pol bs-more">+' + more + "</span></span>" : "");
  var n = goals.length, label = fill(S[n === 1 ? "bs.goals.one" : "bs.goals"], { n: n });
  return '<div class="bs-goals" role="img" aria-label="' + esc(label) + '"><div class="bs-string"></div><div class="bs-pins">' + pol + '</div><div class="bs-gcount">' + esc(label) + "</div></div>";
}
var dot = function (cls) { return '<i class="bs-dot ' + cls + '"></i>'; };
function pill(ok, text) { return '<span class="bs-pill ' + (ok ? "ok" : "gap") + '">' + esc(text) + "</span>"; }

export function createBudgetSummary(o) {
  var el = fromHTML('<section class="bs" hidden aria-label="' + esc(S["bs.title"]) + '"></section>');
  var budget, loaded = false, goals = [], seq = 0;

  function render() {
    if (!loaded) { el.hidden = true; return; }
    if (!budget) { /* no budget yet: a single invitation */
      el.hidden = false;
      el.innerHTML = '<div class="bs-card"><div class="bs-panel bs-invite"><span>' + esc(S["bs.none"]) + '</span><button type="button" class="bs-edit" id="bs-open">' + esc(S["bs.set"]) + "</button></div></div>";
      el.querySelector("#bs-open").addEventListener("click", function () { o.onOpen(this); });
      return;
    }
    var s = summarize(budget, goals, todayDate());
    if (s.status === "empty") { el.hidden = true; return; }
    el.hidden = false;
    var depGap = Math.max(0, s.gap), iniGap = s.poolShort;
    var bad0 = depGap > 0 || iniGap > 0;
    var headline = depGap > 0 ? fill(S["bs.head.month"], { gap: money(depGap) }) : iniGap > 0 ? fill(S["bs.head.initial"], { gap: money(iniGap) }) : S["bs.head.ok"];
    var bad = depGap > 0 || iniGap > 0;
    var iniPill = iniGap > 0 ? pill(false, fill(S["bs.lack"], { gap: money(iniGap) })) : pill(true, S["bs.covered"]);
    var depPill = depGap > 0 ? pill(false, fill(S["bs.lack"], { gap: money(depGap) })) : pill(true, S["bs.covered"]);
    var ring = function (size, sw, id) {
      return '<div class="bs-ringbox">' + rings(left(budget.pool, s.allocated), left(s.saving, s.required), size, sw, id) +
        '<div class="bs-center' + (bad ? " bad" : "") + '" aria-hidden="true">' + (bad ? "!" : "✓") + "</div></div>";
    };
    var edit = '<button type="button" class="bs-edit" aria-label="' + esc(S["bs.editAria"]) + '">' + PencilIcon() + "</button>";
    var rowWide = function (cls, label, p, have, need) {
      return '<div class="bs-row"><div class="bs-row-top">' + dot(cls) + "<span>" + esc(label) + "</span>" + p + '</div><div class="bs-sub">' + esc(leftLine(have, need)) + "</div></div>";
    };
    /* narrow: the gap leads (or "covered"), a bar shows how much of the need is there, and the exact amounts are one small line */
    var rowNarrow = function (cls, label, have, need, leftKey) {
      var gap = need - have, ok = gap <= 0;
      var top = ok ? pill(true, S["bs.covered"]).replace("bs-pill ok", "bs-pill ok " + cls) : '<b class="bs-gap">-' + esc(money(gap)) + "</b>";
      var line = esc(leftLine(have, need));
      var left = "";
      return '<div class="bs-nrow"><div class="bs-nrow-top">' + dot(cls) + "<span>" + esc(label) + "</span>" + top + '</div><div class="bs-bar ' + cls + '"><i style="width:' + pct(need, have).toFixed(0) + '%"></i></div><div class="bs-nline">' + line + "</div>" + left + "</div>";
    };
    el.innerHTML = '<div class="bs-card"><div class="bs-panel">' +
      /* wide screens */
      '<div class="bs-wide">' + ring(128, 10, "bsw") + '<div class="bs-body"><div class="bs-head"><b>' + esc(S["bs.title"]) + "</b>" + edit + "</div>" + pins(goals) +
        rowWide("i", S["bs.initial"], iniPill, budget.pool, s.allocated) + '<div class="bs-sep"></div>' + rowWide("m", S["bs.monthly"], depPill, s.saving, s.required) + "</div></div>" +
      /* narrow screens */
      '<div class="bs-narrow"><div class="bs-top">' + ring(84, 8, "bsn") + '<div class="bs-topt"><div class="bs-head"><b>' + esc(S["bs.title"]) + '</b>' + edit + '</div><div class="bs-headline' + (bad ? " bad" : "") + '">' + esc(headline) + '</div>' + pins(goals) + "</div></div>" +
        '<div class="bs-nrows">' + rowNarrow("i", S["bs.initial"], budget.pool, s.allocated, "bs.left.initial") + rowNarrow("m", S["bs.monthly"], s.saving, s.required, "bs.left.month") + "</div></div>" +
      "</div></div>";
    Array.prototype.forEach.call(el.querySelectorAll(".bs-edit"), function (b) { b.addEventListener("click", function () { o.onOpen(this); }); });
  }

  function load() {
    var mine = ++seq;
    o.budgetRepo.load().then(function (b) { if (mine !== seq) return; budget = b; loaded = true; render(); }).catch(function () { loaded = false; render(); });
  }
  return { el: el, load: load, update: function (g) { goals = g || []; render(); }, destroy: function () { seq++; el.remove(); } };
}
