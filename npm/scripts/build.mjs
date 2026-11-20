/**
 * Builds npm/dist. Runs by itself before `npm pack` and `npm publish` ("prepack").
 *
 *   src/index.mjs  ->  dist/index.mjs   (ES module)
 *                  ->  dist/index.cjs   (CommonJS, for require())
 *                  ->  dist/index.umd.js (plain <script>: defines window.E3dsIframe)
 *   src/index.d.ts ->  dist/index.d.ts
 *
 * [E3DS-NPM-SECRET-SCAN] Fails when anything in the package looks like a secret.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const esm = readFileSync(join(root, "src", "index.mjs"), "utf8")
    .split("__PKG_NAME__").join(pkg.name)
    .split("__PKG_VERSION__").join(pkg.version);
writeFileSync(join(dist, "index.mjs"), esm);

const exported = [];
const body = esm
    .replace(/^export (const|function|async function) ([A-Za-z0-9_]+)/gm, (m, kind, name) => {
        exported.push(name);
        return kind + " " + name;
    })
    .replace(/^export default [^\n]*\n?/m, "");
const list = exported.join(", ");

writeFileSync(join(dist, "index.cjs"),
    '"use strict";\n' + body + "\nmodule.exports = { " + list + " };\nmodule.exports.default = module.exports;\n");

writeFileSync(join(dist, "index.umd.js"),
    "(function (root, factory) {\n"
    + "    if (typeof module === \"object\" && module.exports) module.exports = factory();\n"
    + "    else root.E3dsIframe = factory();\n"
    + "})(typeof globalThis !== \"undefined\" ? globalThis : typeof self !== \"undefined\" ? self : this, function () {\n\"use strict\";\n"
    + body + "\nreturn { " + list + " };\n});\n");

copyFileSync(join(root, "src", "index.d.ts"), join(dist, "index.d.ts"));

const SECRET_PATTERNS = [
    /sk_(live|test)_[0-9A-Za-z]{10,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\b[0-9]{8,10}:AA[0-9A-Za-z_-]{30,}/, /xox[abposr]-[0-9A-Za-z-]{10,}/, /AIza[0-9A-Za-z_-]{35}/,
    /api_key=[A-Za-z0-9]{20,}/, /Auth [A-Za-z0-9._-]{16,}/
];
let bad = 0;
for (const f of ["index.mjs", "index.cjs", "index.umd.js", "index.d.ts"]) {
    const text = readFileSync(join(dist, f), "utf8");
    for (const re of SECRET_PATTERNS) {
        if (re.test(text)) {
            console.error("[E3DS-NPM-SECRET-SCAN] dist/" + f + " matches " + re + " - not publishing.");
            bad++;
        }
    }
}
if (bad) process.exit(1);
console.log("[E3DS-NPM-BUILD] " + pkg.name + "@" + pkg.version + " built: exports " + list);
