import { validPhone, initialOf } from "../src/lib/validate.js";
let fail = 0;
function check(n, c) { if (!c) { fail++; console.log("FAIL", n); } else console.log("ok  ", n); }
check("empty ok", validPhone("") && validPhone("   ") && validPhone(null));
check("9 digits ok", validPhone("050123456"));
check("8 digits bad", !validPhone("05012345"));
check("13 digits ok", validPhone("+972501234567"));
check("14 digits bad", !validPhone("+97250123456789"));
check("hyphen and spaces ok", validPhone("050-000 0000"));
check("letters bad", !validPhone("050-abc-0000"));
check("plus only at start", !validPhone("050+1234567"));
check("initial hebrew", initialOf("  טל") === "ט");
check("initial latin upper", initialOf("dana") === "D");
check("initial empty", initialOf("") === "?");
console.log(fail === 0 ? "ALL PASSED" : fail + " FAILED"); process.exit(fail ? 1 : 0);
