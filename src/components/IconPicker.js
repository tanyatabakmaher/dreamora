import { esc } from "../lib/dom.js";
import { resizeImage, MAX_IMAGE_CHARS } from "../lib/image.js";
import { S } from "../strings.js";
import { Button } from "./ui/Button.js";
/* Pick a goal icon: one of the suggested emoji, or an uploaded picture (which replaces the emoji on the card).
   IconPicker(emojis) returns markup; wireIconPicker(root, emojis) returns { get(), set({emoji,image}) }. */
export function IconPicker() {
  return '<div class="field"><span class="lbl" id="ip-label">' + S["form.emoji"] + "</span>" +
    '<div class="emoji-row" id="ip-emoji" role="group" aria-labelledby="ip-label"></div>' +
    '<div class="img-row"><span class="img-preview" id="ip-preview" hidden></span>' +
    Button({ id: "ip-upload", variant: "ghost", label: S["form.image.upload"] }) +
    Button({ id: "ip-remove", variant: "danger", label: S["form.image.remove"], hidden: true }) +
    '<input type="file" id="ip-file" accept="image/*" hidden></div><div class="err" id="ip-err"></div></div>';
}
export function wireIconPicker(root, emojis) {
  var $ = function (id) { return root.querySelector("#" + id); };
  var value = { emoji: emojis[0], image: null };
  /* A goal saved earlier with an emoji outside the suggested set keeps it: it is shown as one more selected choice after the suggested ones. */
  function options() { return emojis.indexOf(value.emoji) < 0 && value.emoji ? emojis.concat([value.emoji]) : emojis; }
  function paint() {
    var has = !!value.image, list = options();
    $("ip-emoji").innerHTML = list.map(function (e) {
      return '<button type="button" class="emoji-opt" data-emoji="' + esc(e) + '" aria-pressed="' + String(!has && e === value.emoji) + '">' + esc(e) + "</button>";
    }).join("");
    $("ip-preview").hidden = !has;
    $("ip-preview").innerHTML = has ? '<img src="' + esc(value.image) + '" alt="">' : "";
    $("ip-remove").hidden = !has;
    $("ip-upload").textContent = has ? S["form.image.replace"] : S["form.image.upload"];
  }
  $("ip-emoji").addEventListener("click", function (ev) {
    var b = ev.target.closest(".emoji-opt");
    if (!b) return;
    value.emoji = b.dataset.emoji; value.image = null; $("ip-err").textContent = ""; paint();
  });
  $("ip-upload").addEventListener("click", function () { $("ip-file").click(); });
  $("ip-remove").addEventListener("click", function () { value.image = null; $("ip-file").value = ""; $("ip-err").textContent = ""; paint(); });
  $("ip-file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { $("ip-err").textContent = S["error.notImage"]; this.value = ""; return; }
    resizeImage(f, function (data) {
      if (data.length > MAX_IMAGE_CHARS) { $("ip-err").textContent = S["form.image.tooLarge"]; return; }
      value.image = data; $("ip-err").textContent = ""; paint(); }, function () { $("ip-err").textContent = S["error.imageFail"]; });
  });
  return {
    get: function () { return { emoji: value.emoji, image: value.image }; },
    set: function (v) {
      value = { emoji: v.emoji || emojis[0], image: v.image || null };
      $("ip-err").textContent = ""; $("ip-file").value = ""; paint();
    },
    setDisabled: function (d) { Array.prototype.forEach.call(root.querySelectorAll("#ip-emoji button, #ip-upload, #ip-remove"), function (b) { b.disabled = d; }); }
  };
}
