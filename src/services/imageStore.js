/* Picture storage for the "supabase" mode. A new picture arrives as a data URL (from the resize step); it is uploaded to the public bucket "images"
   under the user's own folder with a random name, and the public URL is what gets saved on the goal / profile. Pictures saved earlier as data URLs keep working
   and are moved to storage the next time they are saved. */
import { getClient } from "./supabaseClient.js";
import { uid } from "../lib/dom.js";

var BUCKET = "images";
export function isDataUrl(v) { return typeof v === "string" && v.indexOf("data:") === 0; }
function pathOf(url) {
  if (typeof url !== "string") return null;
  var m = url.match(/\/storage\/v1\/object\/public\/images\/(.+?)(\?.*)?$/);
  return m ? decodeURIComponent(m[1]) : null;
}
export function createImageStore(config) {
  var client = function () { return getClient(config); };
  return {
    /* value: data URL -> uploads and returns the public URL; anything else (URL, null) is returned unchanged. */
    resolve: function (value) {
      if (!isDataUrl(value)) return Promise.resolve(value || null);
      return client().then(function (c) {
        return c.auth.getSession().then(function (r) {
          var u = r.data.session && r.data.session.user;
          if (!u) throw new Error("no session");
          return fetch(value).then(function (res) { return res.blob(); }).then(function (blob) {
            var type = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
            var ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
            var path = u.id + "/" + uid() + "." + ext;
            return c.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: "31536000" }).then(function (res) {
              if (res.error) throw res.error;
              return c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
            });
          });
        });
      });
    },
    /* Best effort: remove a picture that is no longer used. Only files in the bucket are touched. */
    discard: function (url) {
      var p = pathOf(url);
      if (!p) return Promise.resolve();
      return client().then(function (c) { return c.storage.from(BUCKET).remove([p]); }).then(function () {}, function () {});
    }
  };
}
