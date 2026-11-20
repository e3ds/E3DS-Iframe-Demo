import { createE3dsIframe, VERSION, PACKAGE_NAME } from "@eagle3dstreaming/iframe-embed";

/* The public sample app the iframe demo streams. Replace with your own address
 * from the Control Panel. ?url=... overrides it. */
const url = new URLSearchParams(location.search).get("url")
    || "https://connector.eagle3dstreaming.com/v5/demo/EpicPixelStreamingSample/E3DS-Iframe-Demo";

const status = document.getElementById("status");
const stream = createE3dsIframe({ container: "#stream", url });

window.__e3dsTest = { package: PACKAGE_NAME + "@" + VERSION, events: [], appMessages: [] };
window.__e3dsStream = stream;

stream.on("*", (data, type) => {
    if (type === "appMessage") return;
    window.__e3dsTest.events.push({ type, at: Date.now(), message: data && data.message, percent: data && data.percent });
    status.textContent = type;
});
stream.on("appMessage", (msg) => window.__e3dsTest.appMessages.push(msg));
stream.on("session.ending", (e) => { status.textContent = "ended: " + (e.message || ""); });
