import { esc, fromHTML, uid } from "../lib/dom.js";
import { toISODate } from "../lib/calc.js";
import { todayDate } from "../lib/format.js";
import { S } from "../strings.js";
import { TRACKS, EMOJI_SUGGESTED, trackById } from "../data/tracks.js";
import { Field, setFieldError } from "./ui/Field.js";
import { Button, IconButton } from "./ui/Button.js";
import { createModal } from "./ui/Modal.js";
import { IconPicker, wireIconPicker } from "./IconPicker.js";
import { updatePlanSummary } from "./PlanSummary.js";
import { trackTagText } from "./TrackTag.js";

/* Create / edit a goal in a bottom sheet. onSave(goal), onDelete(goal, openerEl). open(goal|null, openerEl). */
var IDS = { name: "gf-name", target: "gf-target", initial: "gf-initial", monthly: "gf-monthly", ret: "gf-return", start: "gf-start" };
var ORDER = ["name", "target", "initial", "monthly", "ret", "start"];

export function createGoalForm(o) {
  var form = fromHTML('<form class="sheet" novalidate role="dialog" aria-modal="true" aria-labelledby="gf-title">' +
    '<div class="sheet-head"><h2 id="gf-title"></h2>' + IconButton({ id: "gf-close", label: S["form.close"], glyph: "✕" }) + "</div>" +
    Field({ id: IDS.name, label: S["form.name"], attrs: 'maxlength="40" autocomplete="off" placeholder="' + esc(S["form.name.placeholder"]) + '"' }) +
    IconPicker() +
    '<div class="row2">' +
    Field({ id: IDS.target, label: S["form.target"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" step="any"' }) +
    Field({ id: IDS.initial, label: S["form.initial"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" step="any"' }) + "</div>" +
    Field({ id: IDS.monthly, label: S["form.monthly"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" step="any"' }) +
    '<div class="row2">' +
    Field({ id: "gf-track", label: S["form.track"], control: '<select class="input" id="gf-track">' + TRACKS.map(function (t) { return '<option value="' + t.id + '">' + esc(t.labelHe) + "</option>"; }).join("") + "</select>" }) +
    Field({ id: IDS.ret, label: S["form.return"], type: "number", num: true, attrs: 'inputmode="decimal" min="0" max="100" step="any"' }) + "</div>" +
    '<div class="track-tag-row"><span class="tag" id="gf-track-tag"></span></div>' +
    '<div class="hint" id="gf-track-hint" style="margin: -6px 0 14px;" hidden></div>' +
    Field({ id: IDS.start, label: S["form.startDate"], type: "date", num: true }) +
    '<div class="summary" id="gf-summary" aria-live="polite"></div>' +
    '<div class="actions">' + Button({ id: "gf-save", type: "submit", label: S["form.save"], grow: true }) +
    Button({ id: "gf-cancel", variant: "ghost", label: S["form.cancel"] }) +
    Button({ id: "gf-delete", variant: "danger", label: S["action.delete"], hidden: true }) + "</div></form>");
  var $ = function (id) { return form.querySelector("#" + id); };
  var modal = createModal({ sheet: form });
  var picker = wireIconPicker(form, EMOJI_SUGGESTED);
  var state = null, attempted = false, touched = {};

  function num(v) { return v === "" || v === null || v === undefined ? NaN : Number(v); }
  function read() {
    return {
      name: $(IDS.name).value.trim(), target: num($(IDS.target).value),
      initial: $(IDS.initial).value === "" ? 0 : num($(IDS.initial).value),
      monthly: num($(IDS.monthly).value), ret: num($(IDS.ret).value), start: $(IDS.start).value
    };
  }
  function validate(v) {
    var e = {};
    if (!v.name) e.name = S["error.required"];
    if ($(IDS.target).value === "") e.target = S["error.required"];
    else if (!(v.target > 0) || v.target > 1e9) e.target = S["error.positiveNumber"];
    if (!(v.initial >= 0)) e.initial = S["error.positiveNumber"];
    if ($(IDS.monthly).value === "") e.monthly = S["error.required"];
    else if (!(v.monthly >= 0)) e.monthly = S["error.positiveNumber"];
    if ($(IDS.ret).value === "") e.ret = S["error.required"];
    else if (!(v.ret >= 0 && v.ret <= 100)) e.ret = S["error.returnRange"];
    if (!v.start) e.start = S["error.required"];
    return e;
  }
  function refresh() {
    var v = read(), errs = validate(v);
    ORDER.forEach(function (k) { setFieldError(form, IDS[k], errs[k] && (attempted || touched[k]) ? errs[k] : ""); });
    var core = !errs.target && !errs.initial && !errs.monthly && !errs.ret && !errs.start;
    $("gf-track-tag").textContent = trackTagText($("gf-track").value, $(IDS.ret).value);
    return { errs: errs, plan: updatePlanSummary($("gf-summary"), v, core) };
  }
  function trackHint() {
    var h = $("gf-track-hint");
    if (state.trackId === "age50") { h.textContent = S["track.hint.age50"]; h.hidden = false; } else h.hidden = true;
  }

  form.addEventListener("input", function (ev) {
    ORDER.forEach(function (k) { if (IDS[k] === ev.target.id) touched[k] = true; });
    refresh();
  });
  $("gf-track").addEventListener("change", function () {
    state.trackId = this.value;
    var t = trackById(this.value);
    $(IDS.ret).value = t.defaultReturnPct === null ? "" : t.defaultReturnPct;
    trackHint(); refresh();
  });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    attempted = true;
    var r = refresh();
    var first = ORDER.find(function (k) { return r.errs[k]; });
    if (first) { $(IDS[first]).focus(); return; }
    if (!r.plan || r.plan.status === "unreachable" || r.plan.status === "tooFar") { $("gf-summary").scrollIntoView({ block: "nearest" }); return; }
    var v = read(), icon = picker.get();
    o.onSave({
      id: state.id, name: v.name, emoji: icon.emoji, image: icon.image, targetAmount: v.target, initialAmount: v.initial,
      monthlyDeposit: v.monthly, trackId: $("gf-track").value, annualReturnPct: v.ret, startDate: v.start, createdAt: state.createdAt
    });
    modal.close();
  });
  $("gf-close").addEventListener("click", function () { modal.close(); });
  $("gf-cancel").addEventListener("click", function () { modal.close(); });
  $("gf-delete").addEventListener("click", function () { o.onDelete(state, this, function () { modal.close(); }); });

  return {
    open: function (goal, openerEl) {
      attempted = false; touched = {};
      var editing = !!goal;
      state = JSON.parse(JSON.stringify(goal || {
        id: uid(), name: "", emoji: EMOJI_SUGGESTED[0], image: null, targetAmount: "", initialAmount: "", monthlyDeposit: "",
        trackId: "sp500", annualReturnPct: trackById("sp500").defaultReturnPct, startDate: toISODate(todayDate()), createdAt: new Date().toISOString()
      }));
      $("gf-title").textContent = editing ? S["form.title.edit"] : S["form.title.create"];
      $(IDS.name).value = state.name;
      $(IDS.target).value = state.targetAmount === "" ? "" : state.targetAmount;
      $(IDS.initial).value = state.initialAmount === "" || state.initialAmount === 0 ? "" : state.initialAmount;
      $(IDS.monthly).value = state.monthlyDeposit === "" ? "" : state.monthlyDeposit;
      $("gf-track").value = state.trackId;
      $(IDS.ret).value = state.annualReturnPct === null || state.annualReturnPct === "" ? "" : state.annualReturnPct;
      $(IDS.start).value = state.startDate;
      picker.set({ emoji: state.emoji, image: state.image });
      $("gf-delete").hidden = !editing;
      trackHint();
      refresh();
      modal.open(openerEl, "#" + IDS.name);
    },
    destroy: function () { modal.destroy(); }
  };
}
