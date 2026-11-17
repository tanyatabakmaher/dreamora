import { esc } from "../lib/dom.js";
import { resizeImage, MAX_IMAGE_CHARS } from "../lib/image.js";
import { S } from "../strings.js";
import { Button } from "./ui/Button.js";
import { PRESET_ICONS, isPresetIcon } from "../data/presetIcons.js";
/* Pick a goal picture: one of the ready-made pictures (pics/icons), or an uploaded picture. A goal saved earlier with an emoji keeps it as one more selected choice.
   IconPicker(emojis) returns markup; wireIconPicker(root, emojis) returns { get(), set({emoji,image}) }. */
export function IconPicker(prefix) {
  var html = '<div class="field"><span class="lbl" id="ip-label">' + S["form.emoji"] + "</span>" +
    '<div class="emoji-row pol-grid" id="ip-emoji" role="group" aria-labelledby="ip-label"></div>' +
    '<input type="file" id="ip-file" accept="image/*" hidden><div class="err" id="ip-err"></div></div>';
  return prefix && prefix !== "ip" ? html.replace(/"ip-/g, '"' + prefix + "-") : html;
}
export function wireIconPicker(root, emojis, onChange, prefix) {
  var P = prefix || "ip";
  function changed() { if (onChange) onChange(); }
  var $ = function (id) { return root.querySelector("#" + id.replace(/^ip-/, P + "-")); };
  var value = { emoji: emojis[0], image: PRESET_ICONS[0].src };
  /* A goal saved earlier with an emoji outside the suggested set keeps it: it is shown as one more selected choice after the suggested ones. */
  /* Every picture is a small polaroid. The uploaded picture (if any) comes first with a remove badge; the upload tile is the last cell. */
  function paint() {
    var preset = isPresetIcon(value.image), custom = !!value.image && !preset;
    var html = custom ? '<div class="pol-cell"><button type="button" class="emoji-opt pic-opt" data-image="' + esc(value.image) + '" aria-label="' + esc(S["form.image.replace"]) + '" aria-pressed="true"><img src="' + esc(value.image) + '" alt=""></button>' +
      '<button type="button" class="pol-remove" aria-label="' + esc(S["form.image.remove"]) + '">\u2715</button></div>' : "";
    html += PRESET_ICONS.map(function (p) {
      return '<div class="pol-cell"><button type="button" class="emoji-opt pic-opt" data-image="' + esc(p.src) + '" aria-label="' + esc(p.label) + '" aria-pressed="' + String(value.image === p.src) + '"><img src="' + esc(p.src) + '" alt=""></button></div>';
    }).join("");
    if (!value.image && value.emoji) html += '<div class="pol-cell"><button type="button" class="emoji-opt pic-opt pol-emoji" data-emoji="' + esc(value.emoji) + '" aria-pressed="true"><span>' + esc(value.emoji) + "</span></button></div>";
    html += '<div class="pol-cell"><button type="button" class="pol-upload" id="' + P + '-upload"><span class="pol-plus" aria-hidden="true">\uff0b</span><span>' + esc(custom ? S["form.image.replace"] : S["form.image.upload"]) + "</span></button></div>";
    $("ip-emoji").innerHTML = html;
  }
  $("ip-emoji").addEventListener("click", function (ev) {
    if (ev.target.closest(".pol-upload")) { $("ip-file").click(); return; }
    if (ev.target.closest(".pol-remove")) { value.image = PRESET_ICONS[0].src; $("ip-file").value = ""; $("ip-err").textContent = ""; paint(); changed(); return; }
    var b = ev.target.closest(".emoji-opt");
    if (!b) return;
    if (b.dataset.image) { value.image = b.dataset.image; }
    else { value.emoji = b.dataset.emoji; value.image = null; }
    $("ip-err").textContent = ""; paint(); changed();
  });
  $("ip-file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { $("ip-err").textContent = S["error.notImage"]; this.value = ""; return; }
    resizeImage(f, function (data) {
      if (data.length > MAX_IMAGE_CHARS) { $("ip-err").textContent = S["form.image.tooLarge"]; return; }
      value.image = data; $("ip-err").textContent = ""; paint(); changed(); }, function () { $("ip-err").textContent = S["error.imageFail"]; });
  });
  return {
    get: function () { return { emoji: value.emoji, image: value.image }; },
    set: function (v) {
      value = { emoji: v.emoji || emojis[0], image: v.image || (v.emoji ? null : PRESET_ICONS[0].src) };
      $("ip-err").textContent = ""; $("ip-file").value = ""; paint();
    },
    setDisabled: function (d) { Array.prototype.forEach.call(root.querySelectorAll("#" + P + "-emoji button"), function (b) { b.disabled = d; }); }
  };
}
