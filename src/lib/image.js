/* Resize an uploaded image to a small square (cover crop) and return a data URL. */
export function resizeImage(file, done, fail) {
  var url = URL.createObjectURL(file), img = new Image();
  img.onload = function () {
    try {
      var size = 160, cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      var ctx = cv.getContext("2d"), s = Math.min(img.naturalWidth, img.naturalHeight);
      var sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      var out = cv.toDataURL("image/webp", 0.85);
      if (out.indexOf("data:image/webp") !== 0) out = cv.toDataURL("image/png");
      URL.revokeObjectURL(url);
      done(out);
    } catch (e) { URL.revokeObjectURL(url); fail(); }
  };
  img.onerror = function () { URL.revokeObjectURL(url); fail(); };
  img.src = url;
}
