import { getShareIndicator, sharingOf } from "../src/lib/share.js";
import { ShareIndicator } from "../src/components/ShareIndicator.js";
let fail = 0;
function check(n, c, i) { if (!c) { fail++; console.log("FAIL", n, i ?? ""); } else console.log("ok  ", n); }
const m = (n) => ({ name: n });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check("no visibility -> private", eq(getShareIndicator({}), { kind: "private" }));
check("private with members -> private", eq(getShareIndicator({ visibility: "private", members: [m("a")] }), { kind: "private" }));
check("shared 0 members", eq(getShareIndicator({ visibility: "shared", members: [] }), { kind: "shared", shown: [], overflow: 0 }));
check("shared 2 members", eq(getShareIndicator({ visibility: "shared", members: [m("a"), m("b")] }), { kind: "shared", shown: [m("a"), m("b")], overflow: 0 }));
check("shared 4 members", eq(getShareIndicator({ visibility: "shared", members: [m("a"), m("b"), m("c"), m("d")] }), { kind: "shared", shown: [m("a"), m("b")], overflow: 2 }));
check("sharingOf default", eq(sharingOf(undefined), { visibility: "private", members: [] }));
check("sharingOf keeps shared", eq(sharingOf({ visibility: "shared", members: [m("a")] }), { visibility: "shared", members: [m("a")] }));
globalThis.document = undefined;
check("private markup label", /aria-label="פרטית"/.test(ShareIndicator({})));
const sh = ShareIndicator({ visibility: "shared", members: [m("דנה"), m("Bob"), m("c"), m("d")] });
check("shared label with more", /aria-label="משותפת עם דנה, Bob ועוד 2"/.test(sh), sh);
check("shared shows +2 and initials", sh.includes("+2") && sh.includes(">ד<") && sh.includes(">B<"));
console.log(fail === 0 ? "ALL PASSED" : fail + " FAILED"); process.exit(fail ? 1 : 0);
