import { fromHTML } from "../lib/dom.js";
import { todayDate } from "../lib/format.js";
import { S } from "../strings.js";
import { Gauge } from "./Gauge.js";
import { GoalCard } from "./GoalCard.js";
import { Button } from "./ui/Button.js";
import { filterGoals, isShared } from "../lib/share.js";
import { LockIcon, UsersIcon, GlobeIcon } from "./ui/Icons.js";
var FILTER_ICONS = { private: LockIcon, shared: UsersIcon, public: GlobeIcon };
/* The grid of goal cards, or the empty state, with a filter row (all / private / shared) when o.canShare() is true or any goal is shared. render(goals) redraws; events go out through onAdd / onEdit(goal, element). */
export function createGoalList(o) {
  var el = fromHTML('<main id="main"></main>');
  var goals = [], others = [], filter = "all"; /* others = public goals of other users, shown under the public filter only */
  function findGoal(id) { return goals.find(function (g) { return g.id === id; }) || others.find(function (g) { return g.id === id; }); }
  function render(list) {
    goals = list;
    if (!goals.length && !others.length) {
      el.innerHTML = '<section class="empty"><div class="gauge">' + Gauge({ pct: 0, bare: true, id: "empty" }) + "</div><h2>" + S["home.empty.title"] + "</h2><p>" +
        S["home.empty.subtitle"] + "</p>" + Button({ label: S["home.empty.cta"], attrs: 'data-action="add"' }) + "</section>";
      return;
    }
    var today = todayDate();
    var showFilter = (o.canShare && o.canShare()) || goals.some(isShared) || goals.some(function (g) { return g.isPublic; }) || others.length > 0;
    if (!showFilter) filter = "all";
    var shown = filter === "public" ? filterGoals(goals, "public").concat(others) : filterGoals(goals, filter);
    var chips = showFilter ? '<div class="filter-row" role="group" aria-label="' + S["filter.aria"] + '">' + ["all", "private", "shared", "public"].map(function (k) {
      return '<button type="button" class="filter-chip' + (filter === k ? " on" : "") + '" data-filter="' + k + '" aria-pressed="' + String(filter === k) + '">' + (FILTER_ICONS[k] ? '<span class="filter-ico" aria-hidden="true">' + FILTER_ICONS[k]() + "</span>" : "") + S["filter." + k] + "</button>";
    }).join("") + "</div>" : "";
    el.innerHTML = chips + (shown.length ? '<div class="grid">' + shown.map(function (g) { return GoalCard(g, today, o.viewer && o.viewer()); }).join("") + "</div>"
      : '<p class="filter-empty">' + S["filter.empty." + filter] + "</p>");
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
    if (f) { filter = f.dataset.filter; render(goals); var again = el.querySelector('[data-filter="' + filter + '"]'); if (again) again.focus(); return; }
    var add = ev.target.closest('[data-action="add"]');
    if (add) { o.onAdd(add); return; }
    var card = ev.target.closest(".card");
    if (card) o.onEdit(findGoal(card.dataset.id), card);
  });
  el.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var card = ev.target.closest(".card");
    if (card && ev.target === card) { ev.preventDefault(); o.onEdit(findGoal(card.dataset.id), card); }
  });
  function setOthers(list) { others = list || []; render(goals); }
  return { el: el, render: render, setOthers: setOthers, reveal: reveal };
}
