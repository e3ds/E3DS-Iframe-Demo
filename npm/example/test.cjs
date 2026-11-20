/**
 * Browser check of the packed package.
 *   1. plain.html - UMD build from node_modules, no bundler: API present.
 *   2. dist/ (Vite build) - ESM import, LIVE against the public demo stream:
 *      wait for the stream to play, ask for device info, check the answer
 *      arrives as an event, then end the session (frees the machine).
 * PUPPETEER=<path to puppeteer> if it is not installed here.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require(process.env.PUPPETEER || "puppeteer");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
function serve(dir) {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const p = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
            fs.readFile(p, (err, data) => {
                if (err) { res.writeHead(404); res.end("not found"); return; }
                res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
                res.end(data);
            });
        }).listen(0, "127.0.0.1", () => resolve(server));
    });
}

(async () => {
    let failed = 0;
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
    });

    // 1. UMD
    let server = await serve(__dirname);
    let page = await browser.newPage();
    await page.goto("http://127.0.0.1:" + server.address().port + "/plain.html", { waitUntil: "load" });
    const umd = await page.evaluate(() => window.__e3dsTest);
    console.log("== plain <script> (UMD)\n" + JSON.stringify(umd));
    if (!umd || !umd.ok) { failed++; console.log("FAIL"); } else console.log("PASS");
    await page.close();
    server.close();

    // 2. Vite build, live stream
    server = await serve(path.join(__dirname, "dist"));
    page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    const t0 = Date.now();
    await page.goto("http://127.0.0.1:" + server.address().port + "/index.html", { waitUntil: "load" });
    console.log("\n== vite build (ESM), live public demo stream");
    let playing = false;
    try {
        await page.waitForFunction(() => window.__e3dsTest.events.some((e) => e.type === "stream.playing" || e.type === "stream.channelOpen"),
            { timeout: Number(process.env.WAIT_MS || 240000), polling: 1000 });
        playing = true;
    } catch (e) {
        console.log("stream did not reach stream.playing in time:", e.message);
    }
    if (playing) {
        await new Promise((r) => setTimeout(r, 3000));
        await page.evaluate(() => window.__e3dsStream.getDeviceInfo());
        try {
            await page.waitForFunction(() => window.__e3dsTest.events.some((e) => e.type === "takeUserDeviceInfo"), { timeout: 15000 });
            console.log("getDeviceInfo() answered with a takeUserDeviceInfo event: PASS");
        } catch (e) {
            failed++;
            console.log("getDeviceInfo() got no answer: FAIL");
        }
        await page.evaluate(() => window.__e3dsStream.terminateSession());
        try {
            await page.waitForFunction(() => window.__e3dsTest.events.some((e) => e.type === "session.ending" || e.type === "commandReceived"), { timeout: 20000 });
            console.log("terminateSession() acknowledged: PASS");
        } catch (e) {
            console.log("terminateSession(): no acknowledgement seen (not fatal)");
        }
    } else failed++;
    const r = await page.evaluate(() => window.__e3dsTest);
    console.log("events (seconds from page load):");
    for (const e of r.events) console.log("  +" + ((e.at - t0) / 1000).toFixed(1) + "s " + e.type + (e.percent != null ? " " + e.percent + "%" : "") + (e.message ? " - " + e.message : ""));
    console.log("app messages:", r.appMessages.length);
    if (pageErrors.length) console.log("page errors:", pageErrors);
    await page.close();
    server.close();
    await browser.close();
    console.log(failed ? "\nFAILED: " + failed : "\nALL PASS");
    process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("[test] crashed:", e); process.exit(1); });
