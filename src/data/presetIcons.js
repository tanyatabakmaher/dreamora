/* Ready-made goal pictures (optimized 256px copies of the files in pics/). A goal that uses one stores the relative path in its image field. */
export const PRESET_ICONS = [
  { id: "travel", src: "pics/icons/goal-1.webp", label: "טיול" },
  { id: "laptop", src: "pics/icons/goal-2.webp", label: "מחשב" },
  { id: "study", src: "pics/icons/goal-3.webp", label: "לימודים" },
  { id: "home", src: "pics/icons/goal-4.webp", label: "בית" },
  { id: "car", src: "pics/icons/goal-5.webp", label: "רכב" },
  { id: "ring", src: "pics/icons/goal-6.webp", label: "טבעת" },
  { id: "baby", src: "pics/icons/goal-7.webp", label: "תינוק" },
  { id: "fitness", src: "pics/icons/goal-8.webp", label: "כושר" },
  { id: "gift", src: "pics/icons/goal-9.webp", label: "מתנה" },
  { id: "savings", src: "pics/icons/goal-10.webp", label: "חיסכון" }
];
export function isPresetIcon(src) { return PRESET_ICONS.some(function (p) { return p.src === src; }); }
