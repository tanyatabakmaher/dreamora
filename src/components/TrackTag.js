import { S } from "../strings.js";
import { trackById } from "../data/tracks.js";
import { Tag } from "./ui/Chip.js";
/* "S&P 500 · 10% לשנה". Used on the goal card and in the track picker so both look the same. */
export function trackTagText(trackId, returnPct) {
  var t = trackById(trackId);
  var pct = Number.isFinite(Number(returnPct)) && returnPct !== "" ? String(Number(returnPct)) : "";
  return S["card.trackReturn"].replace("{track}", t.labelHe).replace("{pct}", pct);
}
export function TrackTag(trackId, returnPct, id) { return Tag({ text: trackTagText(trackId, returnPct), id: id }); }
