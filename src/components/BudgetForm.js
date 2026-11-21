import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { fmtAmountInput, parseAmount } from "../lib/format.js";

/* The top card of "התקציב שלי" (page and first-login sheet): one ring, a three-number row, a two-way switch and the amount rows.
   Mode "s" (first tab): the user enters only what they save each month. Mode "ie": income and expenses (saving = income - expenses).
   Both tabs keep their own numbers; the chosen tab decides which one counts, and it is saved and restored (new users start on "s"). */
export function fill(t, vars) { return Object.keys(vars).reduce(function (s, k) { return s.split("{" + k + "}").join(vars[k]); }, t); }
export function numOf(el) { var n = Number(parseAmount(el.value)); return isFinite(n) && n > 0 ? n : 0; }

var ST = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
function ic(p) { return '<svg viewBox="0 0 24 24" ' + ST + ' aria-hidden="true">' + p + "</svg>"; }
var ICON = {
  pool: ic('<path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h13"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4"/><path d="M20 12h-3a2 2 0 0 0 0 4h3z"/>'),
  income: ic('<path d="M17 7L7 17M7 9v8h8"/>'),
  expenses: ic('<path d="M7 17L17 7M9 7h8v8"/>'),
  saving: ic('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>')
};

/* ₪ in front of the digits, whatever the text direction. */
function money(n) { return "₪" + Math.round(n).toLocaleString("en-US"); }

/* Ring: what is left of the monthly saving (full when nothing is handed out, empty when it is used up). */
export function ring(pct, uid) {
  var size = 200, sw = 24, r = (size - sw) / 2, c = 2 * Math.PI * r, a = c * Math.max(0, Math.min(100, pct)) / 100, gid = uid + "-grad";
  return '<svg class="bd-ring" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true"><defs><linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="0" y2="200">' +
    '<stop offset="0" stop-color="var(--aurora-1)"/><stop offset=".5" stop-color="var(--aurora-2)"/><stop offset="1" stop-color="var(--aurora-3)"/></linearGradient></defs>' +
    '<circle class="bd-ring-track" cx="100" cy="100" r="' + r + '" fill="none" stroke-width="' + sw + '"/>' +
    (a > 0 ? '<circle class="bd-ring-arc" cx="100" cy="100" r="' + r + '" fill="none" stroke="url(#' + gid + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + a.toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 100 100)"/>' : "") + "</svg>";
}

function field(id, icon, label, cls) {
  return '<label class="bd-fl ' + cls + '" for="' + id + '"><span class="bd-fl-ic" aria-hidden="true">' + icon + '</span><span class="bd-fl-label">' + esc(label) + "</span>" +
    '<span class="bd-fl-val"><span aria-hidden="true">₪</span><input class="bd-in num" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" dir="ltr" placeholder="0"></span></label>';
}

/* o.uid: unique prefix for ids; o.onChange(): called after any edit or switch. */
export function createBudgetForm(o) {
  var u = o.uid;
  var el = fromHTML('<div class="bd-form" data-mode="s">' +
    '<div class="bd-donut" aria-live="polite"><div class="bd-ringbox"></div><div class="bd-donut-disc"></div><div class="bd-donut-text"></div></div>' +
    '<div class="bd-tri" hidden></div>' +
    '<div class="bd-seg" role="radiogroup" aria-label="' + esc(S["bd.mode.aria"]) + '"><i aria-hidden="true"></i>' +
    '<button type="button" role="radio" aria-checked="false" data-mode="s">' + esc(S["bd.mode.s"]) + "</button>" +
    '<button type="button" role="radio" aria-checked="false" data-mode="ie">' + esc(S["bd.mode.ie"]) + "</button></div>" +
    '<div class="bd-ledger">' + field(u + "-pool", ICON.pool, S["bd.pool"], "bd-pool") +
    '<div class="bd-ie">' + field(u + "-income", ICON.income, S["bd.income"], "bd-income") + field(u + "-expenses", ICON.expenses, S["bd.expenses"], "bd-expenses") + "</div>" +
    '<div class="bd-sv" hidden>' + field(u + "-saving", ICON.saving, S["bd.saving"], "bd-saving") + "</div></div>" +
    '<div class="bd-result-row bd-ie"><span class="bd-fl-ic" aria-hidden="true">' + ICON.saving + '</span><span class="bd-rr-label">' + esc(S["bd.result"]) + '</span><b class="bd-rr-val num"></b></div>' +
    '<div class="bd-private bd-sv" hidden><span aria-hidden="true">' + ICON.lock + "</span>" + esc(S["bd.private"]) + "</div></div>");
  var q = function (s) { return el.querySelector(s); }, qa = function (s) { return Array.prototype.slice.call(el.querySelectorAll(s)); };
  var pool = q("#" + u + "-pool"), income = q("#" + u + "-income"), expenses = q("#" + u + "-expenses"), saving = q("#" + u + "-saving"), mode = "s";

  function setMode(m) {
    mode = m; el.setAttribute("data-mode", m);
    qa(".bd-seg button").forEach(function (b) { var on = b.getAttribute("data-mode") === m; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
    qa(".bd-ie").forEach(function (n) { n.hidden = m !== "ie"; });
    qa(".bd-sv").forEach(function (n) { n.hidden = m !== "s"; });
  }
  function values() {
    var i = numOf(income), e = numOf(expenses), m = numOf(saving);
    return { pool: numOf(pool), income: i, expenses: e, saving: mode === "s" ? m : Math.max(0, i - e), mode: mode, savingManual: m };
  }
  function setValues(b) {
    function f(x) { return x ? fmtAmountInput(x) : ""; }
    pool.value = f(b.pool); income.value = f(b.income); expenses.value = f(b.expenses); saving.value = f(b.savingManual);
    setMode(b.mode === "ie" ? "ie" : "s");
  }
  /* s = summarize(...) result, or null. With goals the ring shows what is left for deposits; without goals it shows the monthly saving itself. */
  function paint(s) {
    var b = values(), has = !!s && s.status !== "empty", negative = mode === "ie" && b.income > 0 && b.expenses > b.income;
    var empty = mode === "ie" ? b.income <= 0 : b.saving <= 0;
    var used = has ? s.alloc.depositGot : 0, left = Math.max(0, b.saving - used), over = has && s.gap > 0;
    var pct = !b.saving ? 0 : has ? left / b.saving * 100 : 100;
    q(".bd-ringbox").innerHTML = ring(pct, u);
    var t = q(".bd-donut-text");
    if (negative) t.innerHTML = '<span class="bd-donut-hint neg">' + esc(S["bd.donut.negative"]) + "</span>";
    else if (empty) t.innerHTML = '<span class="bd-donut-hint">' + esc(S[mode === "ie" ? "bd.donut.empty" : "bd.donut.emptyS"]) + "</span>";
    else if (!has) t.innerHTML = '<span class="bd-donut-label">' + esc(S["bd.donut.label"]) + '</span><span class="bd-donut-big sm num">' + esc(money(b.saving)) + "</span>";
    else if (over) t.innerHTML = '<span class="bd-donut-big neg">!</span><span class="bd-donut-label neg">' + esc(S["bd.donut.over"]) + "</span>";
    else t.innerHTML = '<span class="bd-donut-big">' + Math.round(pct) + '%</span><span class="bd-donut-label ok">' + esc(S["bd.donut.free"]) + "</span>";
    var tri = q(".bd-tri"); tri.hidden = !has || empty;
    if (!tri.hidden) tri.innerHTML = '<div><small>' + esc(S["bd.tri.have"]) + '<i class="bd-star">*</i></small><b class="num">' + esc(money(s.accrued)) + "</b></div><div><small>" + esc(S["bd.tri.total"]) + '</small><b class="num">' + esc(money(b.saving)) +
      "</b></div><div><small>" + esc(S["bd.tri.left"]) + '</small><b class="num ' + (over ? "neg" : "ok") + '">' + esc(money(left)) + "</b></div>" +
      '<p class="bd-tri-note"><i class="bd-star">*</i> ' + S["bd.tri.note"].replace("{amount}", '<b class="num">' + esc(money(s.interestTotal)) + "</b>") + "</p>";
    q(".bd-rr-val").textContent = money(b.saving);
  }
  [pool, income, expenses, saving].forEach(function (i) { i.addEventListener("input", function () { i.value = fmtAmountInput(i.value); o.onChange(); }); });
  qa(".bd-seg button").forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); o.onChange(); }); });
  setMode(mode);
  return { el: el, values: values, setValues: setValues, paint: paint, mode: function () { return mode; } };
}
