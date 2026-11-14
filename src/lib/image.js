/* Downscale an uploaded image so its longest side is at most 256 px, encode as JPEG (quality 0.8), return a data URL. */
export function resizeImage(file, done, fail) {
  var url = URL.createObjectURL(file), img = new Image();
  img.onload = function () {
    try {
      var max = 256, w = img.naturalWidth, h = img.naturalHeight, scale = Math.min(1, max / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      var cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cw, ch); /* JPEG has no transparency */
      ctx.drawImage(img, 0, 0, cw, ch);
      var out = cv.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(url);
      done(out);
    } catch (e) { URL.revokeObjectURL(url); fail(); }
  };
  img.onerror = function () { URL.revokeObjectURL(url); fail(); };
  img.src = url;
}
export var MAX_IMAGE_CHARS = 150000;
