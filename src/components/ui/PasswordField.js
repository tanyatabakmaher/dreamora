import { Field } from "./Field.js";
import { S } from "../../strings.js";
/* Password input with a show/hide toggle. Call wirePasswordToggle(root, id) once the markup is in the DOM. */
export function PasswordField(o) {
  var control = '<div class="pw-wrap"><input class="input" id="' + o.id + '" type="password" dir="ltr" autocomplete="' + (o.autocomplete || "current-password") + '">' +
    '<button type="button" class="pw-toggle" id="' + o.id + '-toggle" aria-pressed="false">' + S["auth.show"] + "</button></div>";
  return Field({ id: o.id, label: o.label, control: control, hint: o.hint });
}
export function wirePasswordToggle(root, id) {
  var input = root.querySelector("#" + id), btn = root.querySelector("#" + id + "-toggle");
  btn.addEventListener("click", function () {
    var on = input.type === "password";
    input.type = on ? "text" : "password";
    btn.textContent = on ? S["auth.hide"] : S["auth.show"];
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
