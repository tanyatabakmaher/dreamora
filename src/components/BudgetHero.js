import { fromHTML, esc } from "../lib/dom.js";
import { money } from "../lib/format.js";
import { S } from "../strings.js";

/* Top of the "new goal" dialogs: the goal's chosen picture fades into the sheet behind the title row, and a panel shows how much of the free budget this goal uses.
   Outer ring = starting amount (blue), inner ring = monthly deposit (mint); grey = already taken by other goals, red = over what is free.
   createBudgetHero() -> { el, top (slot for the title row), setImage(image), update(avail, initial, monthly) }
   avail = { pool, usedInitial, saving, usedMonthly } (money the user has / saving per month, and what the other goals already use), or null when there is no budget (panel hidden). */
function bannerSrc(src) { return String(src).replace(/^pics\/icons\/(goal-\d+\.webp)$/, "pics/cards/$1"); }
var FALLBACK = "pics/budget-bg.jpg";

function pct(v, total) { return total > 0 ? Math.max(0, Math.min(100, v / total * 100)) : 0; }

function rings(size, outer, inner, over) {
  var sw = 10, h = size / 2, r1 = (size - sw) / 2, r2 = r1 - sw - 3;
  function arc(r, parts) {
    var c = 2 * Math.PI * r, off = 0, out = '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" class="bh-track" stroke-width="' + sw + '"/>';
    parts.forEach(function (p) {
      if (p.p <= 0) return;
      var l = c * p.p / 100;
      out += '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" class="' + p.cls + '" stroke-width="' + sw + '" stroke-dasharray="' + l.toFixed(1) + " " + (c - l).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 ' + h + " " + h + ')"/>';
      off += l;
    });
    return out;
  }
  return '<svg class="bh-rings" viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' + arc(r1, outer) + arc(r2, inner) + "</svg>" +
    (over ? '<span class="bh-bang" aria-hidden="true">!</span>' : "");
}

export function createBudgetHero() {
  var el = fromHTML('<div class="bh"><div class="bh-bg"></div><div class="bh-scrim"></div><div class="bh-top"></div><div class="bh-panel" hidden></div></div>');
  var bg = el.querySelector(".bh-bg"), panel = el.querySelector(".bh-panel");
  function setImage(image) {
    var src = image ? bannerSrc(image) : FALLBACK;
    bg.style.backgroundImage = 'url("' + src.replace(/"/g, "%22") + '")';
  }
  function line(cls, label, left, leftKey, overAmt) {
    return '<div class="bh-line"><span class="bh-dot ' + cls + '"></span><span class="bh-lbl">' + esc(label) + "</span>" +
      '<div class="bh-left' + (overAmt > 0 ? " over" : "") + '">' +
      (overAmt > 0 ? S["bh.over"].replace("{amount}", "<b>" + esc(money(overAmt)) + "</b>") : S[leftKey].replace("{amount}", "<b>" + esc(money(left)) + "</b>")) + "</div></div>";
  }
  function update(avail, initial, monthly) {
    if (!avail) { panel.hidden = true; return; }
    var P = Math.max(0, Number(initial) || 0), D = Math.max(0, Number(monthly) || 0);
    var leftI = avail.pool - avail.usedInitial - P, leftM = avail.saving - avail.usedMonthly - D;
    var overI = leftI < 0 ? -leftI : 0, overM = leftM < 0 ? -leftM : 0;
    var mineI = pct(P, avail.pool), othersI = pct(avail.usedInitial, avail.pool);
    var mineM = pct(D, avail.saving), othersM = pct(avail.usedMonthly, avail.saving);
    if (othersI + mineI > 100) mineI = Math.max(0, 100 - othersI);
    if (othersM + mineM > 100) mineM = Math.max(0, 100 - othersM);
    var over = overI > 0 || overM > 0;
    panel.hidden = false;
    panel.innerHTML = '<div class="bh-ring">' + rings(92,
        [{ p: othersI, cls: "bh-o" }, { p: mineI, cls: overI > 0 ? "bh-x" : "bh-i" }],
        [{ p: othersM, cls: "bh-o" }, { p: mineM, cls: overM > 0 ? "bh-x" : "bh-m" }], over) + "</div>" +
      '<div class="bh-lines">' + line("i", S["bh.initial"], leftI, "bh.left.initial", overI) + line("m", S["bh.monthly"], leftM, "bh.left.month", overM) + "</div>";
  }
  setImage(null);
  return { el: el, top: el.querySelector(".bh-top"), setImage: setImage, update: update };
}
