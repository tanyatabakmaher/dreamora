import { esc } from "../lib/dom.js";
import { resizeImage, MAX_IMAGE_CHARS } from "../lib/image.js";
import { S } from "../strings.js";
import { Button } from "./ui/Button.js";
import { PRESET_ICONS, isPresetIcon } from "../data/presetIcons.js";
/* Pick a goal picture: one of the ready-made pictures (pics/icons), or an uploaded picture. A goal saved earlier with an emoji keeps it as one more selected choice.
   IconPicker(emojis) returns markup; wireIconPicker(root, emojis) returns { get(), set({emoji,image}) }. */
export function IconPicker(prefix) {
  var html = '<div class="field"><span class="lbl" id="ip-label">' + S["form.emoji"] + "</span>" +
    '<div class="emoji-row" id="ip-emoji" role="group" aria-labelledby="ip-label"></div>' +
    '<div class="img-row"><span class="img-preview" id="ip-preview" hidden></span>' +
    Button({ id: "ip-upload", variant: "ghost", label: S["form.image.upload"] }) +
    Button({ id: "ip-remove", variant: "danger", label: S["form.image.remove"], hidden: true }) +
    '<input type="file" id="ip-file" accept="image/*" hidden></div><div class="err" id="ip-err"></div></div>';
  return prefix && prefix !== "ip" ? html.replace(/"ip-/g, '"' + prefix + "-") : html;
}
export function wireIconPicker(root, emojis, onChange, prefix) {
  var P = prefix || "ip";
  function changed() { if (onChange) onChange(); }
  var $ = function (id) { return root.querySelector("#" + id.replace(/^ip-/, P + "-")); };
  var value = { emoji: emojis[0], image: PRESET_ICONS[0].src };
  /* A goal saved earlier with an emoji outside the suggested set keeps it: it is shown as one more selected choice after the suggested ones. */
  function paint() {
    var preset = isPresetIcon(value.image), custom = !!value.image && !preset;
    var html = PRESET_ICONS.map(function (p) {
      return '<button type="button" class="emoji-opt pic-opt" data-image="' + esc(p.src) + '" aria-label="' + esc(p.label) + '" aria-pressed="' + String(value.image === p.src) + '"><img src="' + esc(p.src) + '" alt=""></button>';
    }).join("");
    if (!value.image && value.emoji) html += '<button type="button" class="emoji-opt" data-emoji="' + esc(value.emoji) + '" aria-pressed="true">' + esc(value.emoji) + "</button>";
    $("ip-emoji").innerHTML = html;
    $("ip-preview").hidden = !custom;
    $("ip-preview").innerHTML = custom ? '<img src="' + esc(value.image) + '" alt="">' : "";
    $("ip-remove").hidden = !custom;
    $("ip-upload").textContent = custom ? S["form.image.replace"] : S["form.image.upload"];
  }
  $("ip-emoji").addEventListener("click", function (ev) {
    var b = ev.target.closest(".emoji-opt");
    if (!b) return;
    if (b.dataset.image) { value.image = b.dataset.image; }
    else { value.emoji = b.dataset.emoji; value.image = null; }
    $("ip-err").textContent = ""; paint(); changed();
  });
  $("ip-upload").addEventListener("click", function () { $("ip-file").click(); });
  $("ip-remove").addEventListener("click", function () { value.image = PRESET_ICONS[0].src; $("ip-file").value = ""; $("ip-err").textContent = ""; paint(); changed(); });
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
    setDisabled: function (d) { Array.prototype.forEach.call(root.querySelectorAll("#" + P + "-emoji button, #" + P + "-upload, #" + P + "-remove"), function (b) { b.disabled = d; }); }
  };
}
