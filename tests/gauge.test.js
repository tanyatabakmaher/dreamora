import { pointOnArc, knobColor, textColor, Gauge } from "../src/components/Gauge.js";
let fail = 0;
function check(n, c, i) { if (!c) { fail++; console.log("FAIL", n, i ?? ""); } else console.log("ok  ", n, i ?? ""); }
const near = (a, b) => Math.abs(a - b) < 1e-6;
let p = pointOnArc(0, 80);   check("0% at right end", near(p[0], 180) && near(p[1], 100), p);
p = pointOnArc(50, 80);      check("50% at top", near(p[0], 100) && near(p[1], 20), p);
p = pointOnArc(100, 80);     check("100% at left end", near(p[0], 20) && near(p[1], 100), p);
check("knob red at 0", knobColor(0) === "#e24b4a", knobColor(0));
check("knob yellow at 50", knobColor(50) === "#ef9f27", knobColor(50));
check("knob green at 100", knobColor(100) === "#1d9e75", knobColor(100));
check("text darker green at 100", textColor(100) === "#0f6e56");
check("no progress arc at 0%", !Gauge({ pct: 0, accumulated: 0, target: 1000, id: "a" }).includes('class="g-fill"'));
check("progress arc at 40%", Gauge({ pct: 40, accumulated: 400, target: 1000, id: "a" }).includes('stroke-dasharray="40.00 100"'));
check("aria label has amounts", /aria-label="התקדמות 40 אחוז, 400 ₪ מתוך 1,000 ₪"/.test(Gauge({ pct: 40, accumulated: 400, target: 1000, id: "a" })));
check("badge 100% uses 11px", Gauge({ pct: 100, accumulated: 1000, target: 1000, id: "a" }).includes('font-size="11"'));
console.log(fail === 0 ? "ALL PASSED" : fail + " FAILED"); process.exit(fail ? 1 : 0);
