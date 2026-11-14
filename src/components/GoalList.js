import { fromHTML } from "../lib/dom.js";
import { todayDate } from "../lib/format.js";
import { S } from "../strings.js";
import { Gauge } from "./Gauge.js";
import { GoalCard } from "./GoalCard.js";
import { Button } from "./ui/Button.js";
/* The grid of goal cards, or the empty state. render(goals) redraws; events go out through onAdd / onEdit(goal, element). */
export function createGoalList(o) {
  var el = fromHTML('<main id="main"></main>');
  var goals = [];
  function findGoal(id) { return goals.find(function (g) { return g.id === id; }); }
  function render(list) {
    goals = list;
    if (!goals.length) {
      el.innerHTML = '<section class="empty"><div class="gauge">' + Gauge(0, S["a11y.progress"].replace("{pct}", "0")) + "</div><h2>" + S["home.empty.title"] + "</h2><p>" +
        S["home.empty.subtitle"] + "</p>" + Button({ label: S["home.empty.cta"], attrs: 'data-action="add"' }) + "</section>";
      return;
    }
    var today = todayDate();
    el.innerHTML = '<div class="grid">' + goals.map(function (g) { return GoalCard(g, today); }).join("") + "</div>";
  }
  el.addEventListener("click", function (ev) {
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
  return { el: el, render: render };
}
