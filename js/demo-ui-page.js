/**
 * demo-ui-page.js — the buttons and sidebar of THIS demo page.
 *
 * ── Read this before copying anything from this file ───────────────────────
 *
 * Nothing here is required to embed a stream. This is the demo's own scaffolding:
 * a sidebar, some colour buttons, a fullscreen toggle and a resolution dialog,
 * built only to give you something to click so you can watch messages travel.
 *
 * The parts worth copying into your own project are iframe-config.js,
 * iframe-commands.js and iframe-events.js. This file is the example, not the
 * library.
 *
 * Notice that every function below is short, and that none of them talk to the
 * iframe directly - they all call a named function from iframe-commands.js.
 * That is the pattern to copy: your page's buttons should describe WHAT they
 * want, and let one file worry about HOW it is sent.
 */

/**
 * Colour buttons in the sidebar.
 *
 * The sample app listens for a plain colour name and repaints its 3D model.
 * Your own app will expect whatever you built it to expect - see
 * sendToUnrealApp() in iframe-commands.js for the two common shapes.
 *
 * @param {string} colourName e.g. "red"
 */
function switchColour(colourName) {
    sendToUnrealApp(colourName);
}

/**
 * Fullscreen toggle.
 *
 * Tracks its own on/off state because the button reflects it. The sample app
 * expects an object with a "FullScreen" field set to "On" or "Off".
 */
let isFullScreenOn = false;

function toggleFullScreen() {
    isFullScreenOn = !isFullScreenOn;
    sendToUnrealApp({ FullScreen: isFullScreenOn ? "On" : "Off" });
}

/**
 * Hide one of the platform's own interface elements.
 *
 * A convenience wrapper kept because hiding default UI is one of the most
 * common things an embedder wants, and this shows the shape of it.
 *
 * @param {string} elementId The id of the platform element to hide.
 */
function hideStreamElement(elementId) {
    setStreamElementStyle(elementId, "display", "none");
}

/** Slide the demo's sidebar in and out. */
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const menuButton = document.getElementById("menuButton");

    if (sidebar) sidebar.classList.toggle("show");
    if (menuButton) menuButton.classList.toggle("menu-toggle");
}

/**
 * Reveal the demo's controls once the stream is actually playing.
 *
 * They start hidden so that nothing is clickable while there is still no
 * stream behind it to respond.
 */
function showDemoControls() {
    const sidebar = document.getElementById("sidebar");
    const fullscreenButton = document.getElementById("fullscreenButton");

    if (sidebar) sidebar.style.visibility = "visible";
    if (fullscreenButton) fullscreenButton.style.visibility = "visible";
}

/**
 * Take the controls away once there is no longer a stream behind them.
 *
 * [E3DS-SESSION-END] Every control on this page acts on a running session. Once
 * the session has ended they all silently do nothing, which reads as the page
 * being broken rather than the session being over. Leaving the response log in
 * place on purpose - it is the record of what just happened, and it is the one
 * thing still worth reading.
 */
function hideDemoControls() {
    const sidebar = document.getElementById("sidebar");
    const fullscreenButton = document.getElementById("fullscreenButton");

    if (sidebar) sidebar.style.visibility = "hidden";
    if (fullscreenButton) fullscreenButton.style.visibility = "hidden";

    /* [E3DS-DEMO-STAGES] The floating panel is deliberately LEFT ALONE. Hiding
     * it outright was the first version of this and it was wrong: nothing puts
     * it back, so the first Terminate cost you the panel for the rest of the
     * page's life. The staging already removes every control that needed the
     * session, and what remains - the stream URL, the frame permissions,
     * Restart - is exactly what someone wants next. */
}

/**
 * Handle the "Change Resolution" dialog being submitted.
 *
 * @param {SubmitEvent} event The form's submit event.
 */
function handleResolutionSubmit(event) {
    // Without this the browser would reload the page on submit, which would
    // restart the stream - the opposite of what the visitor asked for.
    event.preventDefault();

    const width = parseInt(event.target.width.value, 10);
    const height = parseInt(event.target.height.value, 10);

    if (Number.isNaN(width) || Number.isNaN(height)) {
        console.warn("[E3DS demo] Resolution needs two numbers.");
        return;
    }

    freezeStreamResolution(width, height);
}

/**
 * Let people type into the dialog's number boxes.
 *
 * The page forwards clicks to the stream so that the app keeps keyboard focus
 * (see focusStream() in iframe-commands.js). Inside a form that would steal
 * focus back the instant someone clicked a text box, making it impossible to
 * type. Stopping the click here keeps the form usable.
 *
 * @param {MouseEvent} event
 */
function keepFocusInDialog(event) {
    event.stopPropagation();
}

/**
 * Highlight whichever sidebar item was clicked.
 *
 * Purely cosmetic. Runs once when the page loads.
 */
function setUpSidebarHighlighting() {
    const sidebarItems = document.querySelectorAll(".list-sidebar li");

    sidebarItems.forEach((item) => {
        item.addEventListener("click", () => {
            sidebarItems.forEach((other) => other.classList.remove("active"));
            item.classList.add("active");
        });
    });
}

/**
 * Send keyboard focus back to the stream whenever the page is clicked.
 *
 * This is what makes typing work after a visitor has clicked something else on
 * your page. See focusStream() in iframe-commands.js for why it is needed.
 *
 * Clicks inside a dialog are excluded, so that form fields remain typeable.
 */
function setUpFocusReturn() {
    document.body.addEventListener("click", (event) => {
        /* THE FLOATING PANELS ARE EXCLUDED FOR THE SAME REASON THE DIALOG IS.
         *
         * This handler hands keyboard focus back to the stream after any click,
         * which is what makes typing work again once a visitor has clicked
         * something on the page. Applied to a text field it is fatal: the click
         * that puts the caret in the field is the same click that takes focus
         * straight back out of it, so the field can never be typed into. The
         * resolution dialog already had to be excluded for this; the control
         * panel now holds fields too, so it needs the same exemption. */
        if (event.target.closest(".modal, #demoButtonPanel, #appResponsePanel")) return;
        focusStream();
    });
}

/** Point the iframe at the URL to use - a remembered one, or the configured. */
function applyConfiguredStreamUrl() {
    const frame = document.getElementById(DEMO_CONFIG.iframeElementId);
    if (frame) frame.src = e3dsCurrentStreamUrl();
}

// Wait for the HTML to exist before touching it. Without this, every
// getElementById above could run before the elements are on the page.
document.addEventListener("DOMContentLoaded", () => {
    applyConfiguredStreamUrl();

    setUpSidebarHighlighting();
    setUpFocusReturn();
});

/**
 * Ask for a console command and send it.
 *
 * A prompt() rather than a dialog because this is about showing the mechanism,
 * not the input. Your own page would send the specific commands you support -
 * see the warning on sendUnrealConsoleCommand().
 */
function promptForConsoleCommand() {
    const command = window.prompt(
        "Unreal console command\n\nExamples:  stat fps   |   stat unit   |   r.ScreenPercentage 50",
        "stat fps"
    );
    if (command) sendUnrealConsoleCommand(command);
}

/**
 * Hide menu items that only work with one particular app.
 *
 * The colour buttons send a command that the E3DSFeaturesTemplate build
 * understands and no other app does. Offering them while streaming something
 * else gives the visitor buttons that appear broken - they press one and
 * nothing happens, with no way to tell whether the demo or the platform is at
 * fault.
 *
 * The owner and app name are read from the stream URL rather than configured
 * twice: `/v5/<owner>/<appName>/<configuration>`. One source of truth, so
 * pointing DEMO_CONFIG.streamUrl at a different app cannot leave this stale.
 *
 * Matched case-INSENSITIVELY. The dashboard treats these names as labels rather
 * than identifiers, and a capital letter is not a reason to hide the buttons.
 *
 * Anything without data-requires-app is left alone - those commands work with
 * any app, which is why they carry no marker.
 */
/**
 * Read the owner and app name out of a stream URL.
 *
 * The shape is `/v5/<owner>/<appName>/<configuration>`, and this is the only
 * place that knows it. Both the sidebar's app-specific items and the floating
 * panel's app-specific buttons ask here, so a change to the URL format is one
 * edit rather than a hunt.
 *
 * A malformed URL gives back empty strings, which hides the app-specific
 * controls. That is the safe direction: a hidden button is a smaller problem
 * than one that silently does nothing.
 *
 * @param {string} url a stream URL
 * @returns {{owner: string, appName: string}}
 */
function e3dsAppFromUrl(url) {
    try {
        const path = new URL(url, window.location.href).pathname;
        const parts = path.split("/").filter(Boolean);   // v5, owner, appName, config
        const v = parts.indexOf("v5");
        if (v >= 0 && parts.length > v + 2) {
            return { owner: parts[v + 1], appName: parts[v + 2] };
        }
    } catch (e) {
        console.warn("[E3DS demo] could not read the app from the stream URL:", e.message);
    }
    return { owner: "", appName: "" };
}


/* [E3DS-WHO-IS-WHO] The two sites, named.
 *
 * Two different websites are involved in an embedded stream and they hold
 * SEPARATE permissions: this page, and the stream inside the iframe, which is a
 * different origin. The padlock a viewer can see belongs to this page. The site
 * being refused may be the stream's, and that one never appears in the address
 * bar.
 *
 * A padlock reading "allowed" and a log reading "denied" are not a
 * contradiction - they are two correct statements about two different sites,
 * and not saying which is which cost most of a day. So nothing in this demo
 * reports a permission without naming the site it belongs to.
 */
function e3dsThisSite() {
    return location.hostname;
}

function e3dsStreamSite() {
    try { return new URL(e3dsCurrentStreamUrl(), location.href).hostname; }
    catch (e) { return "the stream"; }
}

/**
 * The stream URL this page should load.
 *
 * [E3DS-DEMO-CONNECTION] A URL typed into the panel is remembered, so that
 * testing a second app survives the reload that testing it requires. The
 * configured one in iframe-config.js is the default and stays the answer for anyone
 * who has never typed one.
 *
 * localStorage can throw outright - a private window, or a browser set to block
 * site data - so every read and write of it here is guarded. A demo that will
 * not start because it could not remember a URL would be a poor trade.
 */
const E3DS_URL_STORAGE_KEY = "e3dsDemoStreamUrl";

function e3dsCurrentStreamUrl() {
    try {
        const saved = localStorage.getItem(E3DS_URL_STORAGE_KEY);
        if (saved) return saved;
    } catch (e) { }
    return DEMO_CONFIG.streamUrl;
}

function e3dsRememberStreamUrl(url) {
    try { localStorage.setItem(E3DS_URL_STORAGE_KEY, url); } catch (e) { }
}


function applyAppSpecificMenu() {
    const parsed = e3dsAppFromUrl(e3dsCurrentStreamUrl());
    const owner = parsed.owner;
    const appName = parsed.appName;

    const current = (owner + "/" + appName).toLowerCase();

    document.querySelectorAll("[data-requires-app]").forEach(function (el) {
        const wanted = String(el.getAttribute("data-requires-app") || "").toLowerCase();
        el.style.display = (wanted === current) ? "" : "none";
    });

    if (DEMO_CONFIG.logMessages) {
        console.log("[E3DS demo] streaming " + current + " - app-specific menu items "
            + (current === "demo/e3dsfeaturestemplate" ? "shown" : "hidden"));
    }
}

document.addEventListener("DOMContentLoaded", applyAppSpecificMenu);
