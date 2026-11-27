import { fromHTML, esc } from "../lib/dom.js";
import { todayDate } from "../lib/format.js";
import { S } from "../strings.js";
import { Gauge } from "./Gauge.js";
import { GoalCard } from "./GoalCard.js";
import { Button } from "./ui/Button.js";
import { filterGoals, isShared } from "../lib/share.js";
import { LockIcon, UsersIcon, GlobeIcon, SearchIcon, CloseIcon } from "./ui/Icons.js";
var DISC_CATS = ["travel", "car", "home", "gift", "baby", "grad"], DISC_TILT = [-3, 2.5, -1.5, 3, -2.5, 1.5];
var FILTER_ICONS = { private: LockIcon, shared: UsersIcon, public: GlobeIcon };
/* The grid of goal cards, or the empty state, with a filter row (all / private / shared) when o.canShare() is true or any goal is shared. render(goals) redraws; events go out through onAdd / onEdit(goal, element). */
export function createGoalList(o) {
  var el = fromHTML('<main id="main"></main>');
  var goals = [], others = [], filter = "all", query = "", found = null, searching = false, seq = 0, timer = 0; /* query / found: the public-goals search text and its server results (null = no search, show the random list) */ /* others = public goals of other users, shown under the public filter only */
  /* Shown until the first load finishes, so the empty state never flashes for someone who has goals. */
  function showLoader() {
    el.innerHTML = '<section class="goals-loader" role="status" aria-live="polite"><div class="gl-stack" aria-hidden="true">' +
      '<span class="gl-pol gl-p1"><i></i></span><span class="gl-pol gl-p2"><i></i></span><span class="gl-pol gl-p3"><i></i></span></div>' +
      '<p class="gl-text">' + S["loading.goals"] + '</p><div class="gl-dots" aria-hidden="true"><span></span><span></span><span></span></div></section>';
  }
  showLoader();
  function findGoal(id) { return goals.find(function (g) { return g.id === id; }) || others.find(function (g) { return g.id === id; }); }
  function canDiscover() { return !!(o.canDiscover && o.canDiscover()); }
  function resetSearch() { query = ""; found = null; searching = false; seq++; clearTimeout(timer); }
  function cardsHTML(list) { var today = todayDate(); return '<div class="grid">' + list.map(function (g) { return GoalCard(g, today, o.viewer && o.viewer()); }).join("") + "</div>"; }
  /* The results area under the search card: the random list, the matches, a short "searching" line or the no-results state. */
  function resultsHTML() {
    var list = found === null ? others : found;
    if (searching && found === null) return '<p class="disc-empty" role="presentation">' + esc(S["disc.searching"]) + "</p>";
    if (list.length) return cardsHTML(list);
    if (query) return '<div class="filter-empty disc-empty"><p>' + esc(S["disc.empty"].replace("{q}", query)) + '</p><button type="button" class="disc-link" data-disc="clear">' + esc(S["disc.clear"]) + "</button></div>";
    return emptyPublicHTML();
  }
  function emptyPublicHTML() {
    return '<section class="empty"><div class="gauge">' + Gauge({ pct: 0, bare: true, id: "empty" }) + "</div><h2>" + S["filter.empty.public.title"] + "</h2><p>" +
      S["filter.empty.public.subtitle"] + "</p>" + Button({ label: S["filter.empty.public.cta"], attrs: 'data-action="add" data-mode="public"' }) + "</section>";
  }
  function liveText() {
    if (found === null) return "";
    return found.length ? S["disc.count"].replace("{n}", String(found.length)) : S["disc.count.none"];
  }
  function discoverHTML() {
    var cats = DISC_CATS.map(function (k, i) {
      var cap = S["disc.cat." + k], on = query === cap;
      return '<li class="disc-cat"><button type="button" class="disc-pol" data-cat="' + esc(cap) + '" aria-pressed="' + String(on) + '" style="--tilt:' + DISC_TILT[i] + 'deg">' +
        '<img src="pics/welcome/collage/' + k + '.webp" alt="" loading="lazy"><span class="disc-cap">' + esc(cap) + "</span></button></li>";
    }).join("");
    return '<section class="disc" role="search" aria-labelledby="disc-title"><h2 id="disc-title" class="disc-title">' + esc(S["disc.title"]) + '</h2><p class="disc-sub">' + esc(S["disc.subtitle"]) + "</p>" +
      '<div class="disc-field"><span class="disc-ico" aria-hidden="true">' + SearchIcon() + '</span><label class="disc-sr" for="disc-input">' + esc(S["disc.label"]) + "</label>" +
      '<input id="disc-input" class="disc-input" type="search" enterkeyhint="search" autocomplete="off" maxlength="60" placeholder="' + esc(S["disc.placeholder"]) + '" value="' + esc(query) + '">' +
      '<button type="button" class="disc-x" data-disc="clear" aria-label="' + esc(S["disc.clear"]) + '"' + (query ? "" : " hidden") + ">" + CloseIcon() + "</button></div>" +
      '<ul class="disc-cats" aria-label="' + esc(S["disc.cats"]) + '">' + cats + "</ul>" +
      '<p class="disc-live" role="status" aria-live="polite">' + esc(liveText()) + "</p></section>";
  }
  function paintResults() {
    var box = el.querySelector(".disc-results"); if (!box) return;
    box.innerHTML = resultsHTML();
    var live = el.querySelector(".disc-live"); if (live) live.textContent = liveText();
    Array.prototype.forEach.call(el.querySelectorAll(".disc-pol"), function (b) { b.setAttribute("aria-pressed", String(!!query && b.dataset.cat === query)); });
    var x = el.querySelector(".disc-x"); if (x) x.hidden = !query;
  }
  /* Run the search for the current text now (shortcuts and clearing) or after the typing pause. */
  function runSearch() {
    clearTimeout(timer);
    var q = query.trim(), mine = ++seq;
    if (!q) { found = null; searching = false; paintResults(); return; }
    searching = true; paintResults();
    Promise.resolve(o.searchOthers ? o.searchOthers(q) : []).then(function (r) { return r || []; }, function () { return []; }).then(function (r) {
      if (mine !== seq) return;
      found = r; searching = false; paintResults();
    });
  }
  function setQuery(text, now) {
    query = text;
    if (now) runSearch(); else { clearTimeout(timer); timer = setTimeout(runSearch, 300); var x = el.querySelector(".disc-x"); if (x) x.hidden = !query; }
  }
  function render(list) {
    goals = list;
    function emptyHTML(f) {
      var k = f && f !== "all" ? "filter.empty." + f : "home.empty", cta = f && f !== "all" ? "filter.empty." + f + ".cta" : "home.empty.cta";
      return '<section class="empty"><div class="gauge">' + Gauge({ pct: 0, bare: true, id: "empty" }) + "</div><h2>" + S[k + ".title"] + "</h2><p>" +
        S[k + ".subtitle"] + "</p>" + Button({ label: S[cta], attrs: 'data-action="add"' + (f === "private" || f === "shared" || f === "public" ? ' data-mode="' + (f === "shared" ? "friends" : f) + '"' : "") }) + "</section>";
    }
    if (!goals.length && !others.length) { el.innerHTML = emptyHTML(); return; }
    var today = todayDate();
    var showFilter = (o.canShare && o.canShare()) || goals.some(isShared) || goals.some(function (g) { return g.isPublic; }) || others.length > 0;
    if (!showFilter) filter = "all";
    var discover = filter === "public" && canDiscover();
    var shown = filter === "public" ? others : filterGoals(goals, filter); /* "public" = other people's public goals only (the user's own public goals are in "all") */
    var chips = showFilter ? '<div class="filter-row" role="group" aria-label="' + S["filter.aria"] + '">' + ["all", "private", "shared", "public"].map(function (k) {
      return '<button type="button" class="filter-chip' + (filter === k ? " on" : "") + '" data-filter="' + k + '" aria-pressed="' + String(filter === k) + '">' + (FILTER_ICONS[k] ? '<span class="filter-ico" aria-hidden="true">' + FILTER_ICONS[k]() + "</span>" : "") + S["filter." + k] + "</button>";
    }).join("") + "</div>" : "";
    if (discover) { el.innerHTML = chips + discoverHTML() + '<div class="disc-results">' + resultsHTML() + "</div>"; return; }
    el.innerHTML = chips + (shown.length ? '<div class="grid">' + shown.map(function (g) { return GoalCard(g, today, o.viewer && o.viewer()); }).join("") + "</div>"
      : emptyHTML(filter));
  }
  /* Bring a goal's card into view and flash it briefly (no flash with reduced motion). Returns false if the goal is not shown. */
  function reveal(id) {
    var card = el.querySelector('.card[data-id="' + String(id).replace(/"/g, "") + '"]');
    if (!card && filter !== "all") { filter = "all"; render(goals); card = el.querySelector('.card[data-id="' + String(id).replace(/"/g, "") + '"]'); } /* a filtered-out goal: show everything */
    if (!card) return false;
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    if (!calm) { card.classList.add("flash"); setTimeout(function () { card.classList.remove("flash"); }, 1500); }
    card.focus({ preventScroll: true });
    return true;
  }
  el.addEventListener("click", function (ev) {
    var f = ev.target.closest("[data-filter]");
    if (f) { filter = f.dataset.filter; resetSearch(); render(goals); var again = el.querySelector('[data-filter="' + filter + '"]'); if (again) again.focus(); return; }
    var dc = ev.target.closest("[data-disc]");
    if (dc) { setQuery("", true); var inp = el.querySelector(".disc-input"); if (inp) { inp.value = ""; inp.focus(); } return; }
    var cat = ev.target.closest(".disc-pol");
    if (cat) { var cap = cat.dataset.cat, off = query === cap; setQuery(off ? "" : cap, true); var inp2 = el.querySelector(".disc-input"); if (inp2) inp2.value = off ? "" : cap; return; }
    var add = ev.target.closest('[data-action="add"]');
    if (add) { o.onAdd(add); return; }
    var del = ev.target.closest('[data-action="delete"]');
    if (del) { ev.stopPropagation(); var dc = del.closest(".card"); if (o.onDelete && dc) o.onDelete(findGoal(dc.dataset.id), del); return; }
    var card = ev.target.closest(".card");
    if (card) o.onEdit(findGoal(card.dataset.id), card);
  });
  el.addEventListener("input", function (ev) {
    if (!ev.target.classList || !ev.target.classList.contains("disc-input")) return;
    setQuery(ev.target.value, false);
    Array.prototype.forEach.call(el.querySelectorAll(".disc-pol"), function (b) { b.setAttribute("aria-pressed", String(!!query && b.dataset.cat === query)); });
  });
  el.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var card = ev.target.closest(".card");
    if (card && ev.target === card) { ev.preventDefault(); o.onEdit(findGoal(card.dataset.id), card); }
  });
  function setOthers(list) { others = list || []; render(goals); }
  return { el: el, render: render, setOthers: setOthers, reveal: reveal, showLoader: showLoader };
}
