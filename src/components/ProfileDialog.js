import { fromHTML, esc } from "../lib/dom.js";
import { S } from "../strings.js";
import { resizeImage, MAX_IMAGE_CHARS } from "../lib/image.js";
import { validPhone } from "../lib/validate.js";
import { Button } from "./ui/Button.js";
import { Field, setFieldError } from "./ui/Field.js";
import { Avatar } from "./ui/Avatar.js";
import { CameraIcon, CloseIcon } from "./ui/Icons.js";
import { createModal } from "./ui/Modal.js";
import { showToast } from "./ui/Toast.js";

/* Profile settings: photo, name, read-only email, optional phone.
   o.save(profile) -> Promise of the saved profile; o.onSaved(profile). open(profile, openerEl). Cancel / close / Esc discard. */
export function createProfileDialog(o) {
  var sheet = fromHTML('<div class="sheet profile-sheet" role="dialog" aria-modal="true" aria-labelledby="pf-title">' +
    '<div class="sheet-head"><h2 id="pf-title">' + S["profile.title"] + "</h2>" +
    '<button type="button" class="icon-btn" id="pf-close" aria-label="' + esc(S["profile.close"]) + '">' + CloseIcon() + "</button></div>" +
    '<form id="pf-form" novalidate><div class="photo-row"><div class="photo-avatar" id="pf-avatar"></div>' +
    '<div class="photo-actions"><button type="button" class="linkbtn" id="pf-upload"></button>' +
    '<button type="button" class="linkbtn danger-link" id="pf-remove">' + S["profile.photo.remove"] + "</button>" +
    '<div class="hint">' + S["profile.photo.hint"] + '</div><div class="err" id="pf-photo-err"></div></div>' +
    '<input type="file" id="pf-file" accept="image/*" hidden></div>' +
    Field({ id: "pf-name", label: S["profile.name"], attrs: 'maxlength="60" autocomplete="name"' }) +
    Field({ id: "pf-email", label: S["profile.email"], type: "email", hint: S["profile.email.note"], attrs: 'readonly tabindex="-1"' }) +
    Field({ id: "pf-phone", label: S["profile.phone"], type: "tel", attrs: 'inputmode="tel" autocomplete="tel" placeholder="' + esc(S["profile.phone.placeholder"]) + '" dir="ltr" style="text-align:right"' }) +
    '<div class="actions">' + Button({ id: "pf-save", type: "submit", label: S["profile.save"], grow: true }) +
    Button({ id: "pf-cancel", variant: "ghost", label: S["profile.cancel"], grow: true }) + "</div></form></div>");
  var modal = createModal({ sheet: sheet });
  var $ = function (id) { return sheet.querySelector("#" + id); };
  var photo = null, name = "";

  function paintPhoto() {
    $("pf-avatar").innerHTML = Avatar({ name: $("pf-name").value || name, photo: photo }) +
      '<button type="button" class="cam-badge" id="pf-cam" aria-label="' + esc(S["profile.photo.upload"]) + '">' + CameraIcon() + "</button>";
    $("pf-upload").textContent = photo ? S["profile.photo.change"] : S["profile.photo.upload"];
    $("pf-remove").hidden = !photo;
  }
  function pick() { $("pf-file").click(); }
  sheet.addEventListener("click", function (ev) { if (ev.target.closest("#pf-cam")) pick(); });
  $("pf-upload").addEventListener("click", pick);
  $("pf-remove").addEventListener("click", function () { photo = null; $("pf-file").value = ""; $("pf-photo-err").textContent = ""; paintPhoto(); });
  $("pf-file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { $("pf-photo-err").textContent = S["error.notImage"]; this.value = ""; return; }
    resizeImage(f, function (data) {
      if (data.length > MAX_IMAGE_CHARS) { $("pf-photo-err").textContent = S["form.image.tooLarge"]; return; }
      photo = data; $("pf-photo-err").textContent = ""; paintPhoto();
    }, function () { $("pf-photo-err").textContent = S["error.imageFail"]; });
  });
  $("pf-name").addEventListener("input", function () { if (!photo) paintPhoto(); });
  $("pf-close").addEventListener("click", modal.close);
  $("pf-cancel").addEventListener("click", modal.close);
  $("pf-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var n = $("pf-name").value.trim(), ph = $("pf-phone").value.trim();
    setFieldError(sheet, "pf-name", n ? "" : S["error.required"]);
    setFieldError(sheet, "pf-phone", validPhone(ph) ? "" : S["error.invalidPhone"]);
    if (!n) { $("pf-name").focus(); return; }
    if (!validPhone(ph)) { $("pf-phone").focus(); return; }
    var btn = $("pf-save"); btn.disabled = true;
    o.save({ name: n, photo: photo, phone: ph }).then(function (saved) {
      btn.disabled = false; modal.close(); o.onSaved(saved); showToast(S["profile.saved"], "success");
    }).catch(function (e) {
      btn.disabled = false; showToast(e && e.storage ? S["error.storageFull"] : S["profile.saveFailed"]);
    });
  });
  return {
    open: function (p, opener) {
      name = p.name || ""; photo = p.photo || null;
      $("pf-name").value = name; $("pf-email").value = p.email || ""; $("pf-phone").value = p.phone || "";
      setFieldError(sheet, "pf-name", ""); setFieldError(sheet, "pf-phone", "");
      $("pf-photo-err").textContent = ""; $("pf-file").value = "";
      paintPhoto(); modal.open(opener, "#pf-name");
    },
    destroy: function () { modal.destroy(); }
  };
}
