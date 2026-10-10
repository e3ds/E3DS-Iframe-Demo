/**
 * iframe-events.js — receiving events FROM the platform and from your app.
 *
 * This is the other half of iframe-commands.js. That file sends; this one
 * listens. Together they are the whole of the integration.
 *
 * ── Two different senders, one listener ────────────────────────────────────
 *
 * Your page receives messages from two separate places, and telling them apart
 * is the first thing this file does:
 *
 *   1. THE PLATFORM  - progress updates about starting the stream: queue
 *                      position, download progress, "ready to play", "the
 *                      session ended". These always carry a `type` field.
 *
 *   2. YOUR UNREAL APP - whatever your own app chooses to send back to the
 *                      page. These do NOT carry a `type` field; they arrive as
 *                      a JSON string containing a `cmd` field.
 *
 * That presence-or-absence of `type` is the only reliable way to tell them
 * apart, which is why routeIncomingMessage() checks exactly that.
 *
 * ── You do not have to handle all of these ─────────────────────────────────
 *
 * Every event below is optional. A minimal integration can ignore all of them
 * and still work. They exist so you can replace the platform's default loading
 * screen with your own, show progress, and handle the stream ending gracefully.
 */

/* ── The startup sequence ───────────────────────────────────────────────────
 *
 * Starting a stream is not instant: a real machine has to be found, your app
 * may need downloading, and then it has to launch. The platform reports each
 * step so you can keep your visitor informed instead of showing a blank frame.
 *
 *   sequence  event                          what has happened
 *   ────────  ─────────────────────────────  ─────────────────────────────────
 *     1000    session.queued                 waiting for a free machine
 *     1100    session.queuePositionChanged   your place in the queue moved
 *     2000    session.machineAssigned        a machine has been found
 *     3000    session.machineReserved        it is now reserved for you
 *     4000    app.downloadProgress           downloading   (0-100, optional)
 *     5000    app.prepareProgress            preparing     (0-100, optional)
 *     7000    stream.ready                   ready to start
 *     8000    stream.playing                 playing - video is visible
 *
 * TWO NAMES FOR EVERY EVENT. Each one is also sent under an older, numbered
 * name (stage1_inqueued, stage2_deQueued, and so on). They are the same event
 * sent twice, not two events. The old names still work and are not going away,
 * so existing code keeps running - but prefer the names above in anything new:
 * they say what happened rather than what position it holds in a list.
 *
 * WHY THE NUMBERS ARE IN A FIELD AND NOT THE NAME. Each event carries a
 * `sequence` number, spaced a thousand apart. That gap is deliberate: a new
 * step between machineAssigned (2000) and machineReserved (3000) becomes 2500,
 * and nothing already written has to change. With the old scheme the position
 * was baked into the name, so there was no room to insert anything - which is
 * exactly why the two progress events had to be wedged in as "stage3_1" and
 * "stage3_2".
 *
 * DO NOT RELY ON EVERY EVENT ARRIVING. The two progress events only appear
 * when there is something to download or prepare, so an already-warm machine
 * can go straight from machineReserved to ready. Sort by `sequence` if you need
 * ordering; never assume the next event is the next number.
 */

/**
 * The old numbered event names, kept only so this demo can ignore them.
 *
 * Every lifecycle event arrives twice - once under the name here, and once
 * under its modern name. This demo listens for the modern names, so it skips
 * anything in this set to avoid running each handler twice.
 *
 * You do not need this list in your own page unless you are doing the same
 * thing. If you handle only one vocabulary, the other is simply unhandled.
 */
const LEGACY_EVENT_NAMES = new Set([
    "stage1_inqueued",
    "stage2_deQueued",
    "stage3_slotOccupied",
    "stage3_1_AppAcquiringProgress",
    "stage3_2_AppPreparationProgress",
    "stage4_playBtnShowedUp",
    "stage5_playBtnPressed",
    "QueueNumberUpdated",
    /* Every value the message can take, and what causes each:
     *   https://learn.eagle3dstreaming.com/wiki/session-end-messages
     * A link rather than a list: the same set reaches the web SDK, and a copy
     * here would be the one nobody updates when an ending is added. */
    "redirectingWithMessage",
    "handleStreamerDisconnected",
    "sessionExpired",
    "videoStreamFailed",
    "Error_Redirect"
]);

/**
 * Say where the viewer is in the queue, when that is known.
 *
 * The last known position is remembered, because session.queued can arrive
 * again after a position update and would otherwise wipe a number the viewer
 * had already been shown - going from "position 3" back to "waiting" reads as
 * having lost your place.
 *
 * A position is only shown when it is a real number. Guarding on `!= null`
 * alone would print "position undefined", and 0 is a legitimate value meaning
 * next in line.
 *
 * The total is remembered separately from the position. session.queued does
 * not carry one, so a position update that arrives afterwards must not lose the
 * queue depth the viewer was already shown.
 *
 * @param {number} [position] Place in the queue, if the event carried one.
 * @param {number} [total]    How many are waiting for the same app, if known.
 */
let lastKnownQueuePosition = null;
let lastKnownQueueTotal = null;

function showQueueStatus(position, total) {
    const n = Number(position);
    if (Number.isFinite(n)) lastKnownQueuePosition = n;

    const t = Number(total);
    if (Number.isFinite(t) && t > 0) lastKnownQueueTotal = t;

    if (lastKnownQueuePosition === null) {
        showLoadingStatus("Waiting in the queue for a free machine…");
        return;
    }
    /* THE NUMBER IS ALWAYS SHOWN, INCLUDING AT POSITION 1.
     *
     * This used to print "you are next." on its own for position 1 and return
     * before ever rendering a digit. Which is friendlier English and completely
     * useless: the viewer asked for their queue number and the one case where
     * the answer is best - you are at the front - was the case that hid it.
     * Reported from a phone as "still not showing any queue number" while the
     * queue message was in fact arriving correctly.
     *
     * "you are next" is now an addition to the number, never a replacement. */
    const depth = (lastKnownQueueTotal && lastKnownQueueTotal >= lastKnownQueuePosition)
        ? (" of " + lastKnownQueueTotal)
        : "";
    const next = (lastKnownQueuePosition <= 1) ? " — you are next" : "";
    showLoadingStatus("Waiting in the queue — position "
        + lastKnownQueuePosition + depth + next + ".");
}

/**
 * Update the text on this demo's loading screen.
 *
 * Replace the body of this function with whatever your own design needs - it
 * exists to keep the wording in one place rather than scattered through the
 * event handler below.
 *
 * @param {string} text What to show the visitor right now.
 */
function showLoadingStatus(text) {
    const statusElement = document.getElementById("loadingStatusText");
    if (statusElement) statusElement.innerText = text;
}

/** Show this demo's loading screen and hide the stream behind it. */
function showLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) loadingScreen.style.visibility = "visible";
}

/** Hide the loading screen so the stream shows through. */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) loadingScreen.style.display = "none";
}

/** Reveal the container that holds the stream and the demo's own controls. */
function showStreamArea() {
    const streamArea = document.getElementById("streamArea");
    if (streamArea) streamArea.style.visibility = "visible";
}

/** Hide the stream area, e.g. when a session has ended. */
function hideStreamArea() {
    const streamArea = document.getElementById("streamArea");
    if (streamArea) streamArea.style.visibility = "hidden";
}

/**
 * Show this demo's "the stream has ended" screen.
 *
 * @param {string} message A short line of text explaining what happened.
 */
function showSessionEndedScreen(message) {
    const overlay = document.getElementById("sessionEndOverlay");
    const overlayMessage = document.getElementById("sessionEndOverlayMessage");

    if (overlayMessage) overlayMessage.innerText = message || "The stream has ended.";
    if (overlay) overlay.style.display = "flex";

    /* A WAY OUT. The overlay covers the window, so without this the only thing
     * left to do is reload the tab by hand - and the whole point of an
     * end-of-session screen is that the page keeps control of the moment. */
    if (overlay && !document.getElementById("sessionEndRestart")) {
        const again = document.createElement("button");
        again.id = "sessionEndRestart";
        again.className = "session-end-overlay__button";
        again.textContent = "Start a new session";
        again.addEventListener("click", () => {
            overlay.style.display = "none";
            showLoadingScreen();
            showLoadingStatus("Starting a new session…");
            reloadStream();
        });
        overlay.appendChild(again);
    }
}

/**
 * Show a short message from the platform over the stream.
 *
 * [E3DS-VIEWER-NOTICE] A toast, not a dialog: it is an explanation, not a
 * decision, and it must not take the pointer away from the stream at the exact
 * moment it is telling the viewer to click on it.
 *
 * @param {string} text what to say
 */
function showStreamNotice(text) {
    if (!text) return;

    let host = document.getElementById("streamNotice");
    if (!host) {
        host = document.createElement("div");
        host.id = "streamNotice";
        document.body.appendChild(host);
    }

    host.textContent = text;
    host.classList.add("is-visible");

    /* Each notice replaces the one before it and restarts the clock, so a burst
     * of them does not queue up behind a timer already running. */
    clearTimeout(showStreamNotice.timer);
    showStreamNotice.timer = setTimeout(function () {
        host.classList.remove("is-visible");
    }, 6000);

    logSessionEvent("notice", text);
}

/**
 * Save a screenshot the frame painted for us.
 *
 * [E3DS-SCREENSHOT-IFRAME] The saving happens HERE rather than in the frame
 * because Chrome refuses a download started inside a cross-origin iframe that
 * has no user activation of its own - and the click was on this page's button,
 * so the frame had none. This document is top-level and has no such limit.
 *
 * @param {object} data { ok, dataUrl, fileName, width, height, error }
 */
function saveStreamScreenshot(data) {
    if (!data || !data.ok) {
        window.e3dsLogAppResponse((data && data.error) || "the frame could not take one",
            "err", "screenshot");
        return;
    }

    const link = document.createElement("a");
    link.href = data.dataUrl;
    link.download = data.fileName || "screenshot.png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    logSessionEvent("screenshot", "saved " + data.fileName +
        " (" + data.width + " x " + data.height + ")");
}

/**
 * Put one line about the session's fate into the response log.
 *
 * [E3DS-SESSION-END] WHY THE LOG AS WELL AS THE SCREEN. The end-of-session
 * screen is for the visitor: one sentence, no jargon, and it covers the stream.
 * The log is for whoever is testing the integration, and it answers a different
 * question - did the platform actually tell the page anything? A stream that
 * stops with nothing in the log means the notice never arrived; a stream that
 * stops with a line in the log and no screen means the notice arrived and this
 * page failed to show it. Those are opposite bugs and they look identical from
 * the outside, which is exactly why both are recorded.
 *
 * @param {string} event   the platform event name
 * @param {string} [message] whatever the platform said about it
 */
function logSessionEvent(event, message) {
    if (typeof window.e3dsLogAppResponse !== "function") return;
    window.e3dsLogAppResponse(message || "(no message was sent)", "note", event);
}

/**
 * The session has ended: show the visitor, and record it for the tester.
 *
 * @param {string} fallback wording to use when the platform sent none
 * @param {string} [message] the platform's own wording
 */
function reportSessionEnded(fallback, message) {
    const text = (message && String(message).trim()) ? String(message) : fallback;

    logSessionEvent("session.ending", message);
    showSessionEndedScreen(text);
    hideLoadingScreen();

    /* The controls now drive a stream that is gone. Every one of them would be
     * a button that does nothing, which is worse than no button. */
    hideDemoControls();

    /* [E3DS-CONNECTION-LOCK] ...but choosing what to load next is exactly what is wanted now. */
    if (typeof e3dsSetConnectionLocked === "function") e3dsSetConnectionLocked(false, "the session ended");
}

/**
 * Handle one event sent by the PLATFORM (identified by its `type` field).
 *
 * @param {object} data The message body, e.g. { type: "stage2_deQueued" }.
 */
/* [E3DS-LEGACY-STAGE-NAMES] The original name of each lifecycle event, and the
 * modern one this page is written against.
 *
 * Every deployment sends the left-hand column. Newer ones send the right-hand
 * column as well. Mapping one onto the other here means the switch below has a
 * single case per event and works against either.
 */
const E3DS_LIFECYCLE_ALIASES = {
    "onConfigAcquire":                                 "session.configAcquired",
    "stage1_inqueued":                                 "session.queued",
    "QueueNumberUpdated":                              "session.queuePositionChanged",
    "stage2_deQueued":                                 "session.machineAssigned",
    "stage3_slotOccupied":                             "session.machineReserved",
    "stage3_1_AppAcquiringProgress":                   "app.downloadProgress",
    "stage3_2_AppPreparationProgress":                 "app.prepareProgress",
    "stage4_playBtnShowedUp":                          "stream.ready",
    "stage5_playBtnPressed":                           "stream.playing",
    "bidirectionalChannelBetweenUnrealAndIframeReady": "stream.channelOpen",
    "DataChannelClose":                                "stream.channelClosed",
    "redirectingWithMessage":                          "session.ending",
    "handleStreamerDisconnected":                      "app.stopped",
    "sessionExpired":                                  "session.expired",
    "videoStreamFailed":                               "stream.failed",
    "Error_Redirect":                                  "session.error"
};

/* [E3DS-LEGACY-STAGE-NAMES] How long two copies of one event count as one.
 *
 * A current player announces each lifecycle event under up to three names, one
 * after another in the same tick. An older one sends the legacy name only. This
 * page has to work against both, so it acts on WHICHEVER ARRIVES FIRST and then
 * ignores the other copies of the same event for a moment afterwards.
 *
 * Three seconds is far longer than the gap between copies (they are sent
 * together) and far shorter than the gap between real events. */
const E3DS_SAME_EVENT_MS = 3000;
const e3dsLastHandled = {};

/* Events that legitimately repeat, and must never be deduplicated: each copy
 * carries a NEW value, and swallowing one freezes a progress bar or a queue
 * position at whatever it happened to say. */
const E3DS_REPEATING_EVENTS = new Set([
    "session.queuePositionChanged",
    "app.downloadProgress",
    "app.prepareProgress"
]);

function handlePlatformEvent(data) {
    /* The SDK-named copy is a third copy of an event, not a third event. Only
     * the dotted copy carries `phase`, so a message with a legacyType and no
     * phase is the SDK-named one - dropped here so it does not report itself as
     * an unrecognised event. */
    if (data.legacyType !== undefined && data.phase === undefined) return;

    /* [E3DS-LEGACY-STAGE-NAMES] Resolve whatever name arrived to one name.
     *
     * This used to ignore the legacy copies outright and handle only the modern
     * dotted names. That is correct against a player that sends both - and
     * silently does NOTHING against one that sends only the old names, which is
     * what a deployment that predates the dotted names sends. The symptom was
     * not an error: the stream played perfectly inside the frame while this
     * page's loading screen sat on top of it forever, because stream.playing
     * never reached the switch below. */
    const modern = E3DS_LIFECYCLE_ALIASES[data.type];
    if (modern) data = Object.assign({}, data, { type: modern });

    if (!E3DS_REPEATING_EVENTS.has(data.type)) {
        const now = Date.now();
        const last = e3dsLastHandled[data.type] || 0;
        if (now - last < E3DS_SAME_EVENT_MS) return;
        e3dsLastHandled[data.type] = now;
    }

    /* THE SDK-NAMED COPY IS A THIRD COPY, not a third event.
     *
     * Every lifecycle event now arrives up to three times: the old numbered
     * name, the SDK's own callback name (onDataChannelOpen, onSessionExpired,
     * and so on), and the modern dotted name. The SDK-named copy exists so a
     * page written against the SDK can be moved to the iframe without renaming
     * anything - it is not for a page like this one, which already handles the
     * dotted names, and acting on it would run every handler twice.
     *
     * Telling it apart: only the dotted copy carries `phase`. So a message with
     * a legacyType but no phase is the SDK-named one. Without this it fell to
     * the default case and reported itself as an unrecognised event, which is a
     * warning about something working exactly as intended. */
    if (data.legacyType !== undefined && data.phase === undefined) return;

    switch (data.type) {

        /* ── Startup progress ──────────────────────────────────────────── */

        /* session.queued CARRIES THE POSITION TOO, and this used to ignore it.
         *
         * The platform sends stage1_inqueued with the position on it, and
         * normalises that onto the modern event as
         * queuePosition. session.queuePositionChanged comes from the loader and
         * may never fire at all, so waiting for it meant the viewer only ever
         * saw "waiting for a free machine" with no idea how long. */
        case "session.queued":
            showLoadingScreen();
            showQueueStatus(data.queuePosition, data.queueTotal);
            break;

        // How many people are ahead of you. Sent repeatedly as the queue moves,
        // so it is the right source for a "you are number N in line" display.
        case "session.queuePositionChanged":
            showQueueStatus(data.queuePosition, data.queueTotal);
            break;

        case "session.machineAssigned":
            showLoadingStatus("A machine is available. Reserving it…");
            break;

        case "session.machineReserved":
            showLoadingStatus("Machine reserved. Preparing your app…");
            break;

        // Only arrives when the app actually has to be downloaded. `percent`
        // is a number from 0 to 100.
        case "app.downloadProgress":
            showLoadingStatus(`Downloading the app… ${data.percent}%`);
            break;

        // Only arrives when the downloaded app has to be unpacked/prepared.
        case "app.prepareProgress":
            showLoadingStatus(`Preparing the app… ${data.percent}%`);
            break;

        // The app is ready and waiting to be started.
        case "stream.ready":
            showLoadingStatus("Ready. Starting…");
            showStreamArea();
            break;

        // Playing. This is the point at which the visitor can actually see and
        // interact with the app, so it is the right moment to remove your
        // loading screen for good and reveal your own controls.
        case "stream.playing":
            hideLoadingScreen();
            showStreamArea();
            showDemoControls();
            focusStream();
            break;

        /* ── Keyboard focus ────────────────────────────────────────────── */

        // The platform is asking for keyboard focus, which happens when the app
        // needs typed input (for example when a text box inside the app is
        // selected). Without honouring this, typing silently goes nowhere.
        //
        // If you take only one thing from this file into your own page, take
        // this: an app with any text input in it needs this handler.
        case "_focus":
            focusStream();
            break;

        // The platform is checking whether it is embedded. Answer it, or some
        // embed-specific behaviour will not switch on.
        case "isIframe":
            confirmRunningInIframe();
            break;

        /* ── The session ending ────────────────────────────────────────── */

        // Fires when the stream ends for essentially ANY reason: the app
        // crashed, the visitor was idle too long, the session or link expired,
        // a password was wrong, and so on.
        //
        // `message` is a short, human-readable line you can show your visitor.
        // It arrives just BEFORE the platform's own plain "ended" page would
        // appear inside the frame - that gap is your opportunity to show your
        // own screen instead, which is what this demo does.
        //
        // DO show data.message to the visitor, or ignore it and show your own
        //    wording or graphic entirely.
        // DO NOT write code that inspects the wording to work out what
        //    happened ("does it contain the word crash?"). Treat it as text for
        //    a person to read - the exact wording can change.
        case "session.ending":
            reportSessionEnded("The session ended", data.message);
            break;

        // Optional. Fires only when the app itself has stopped running - a
        // crash, an unexpected close, or its machine going down - and NOT for
        // an ordinary end of session. It carries no message, only the fact.
        //
        // Use it for a yes/no decision, such as whether an automatic reconnect
        // is worth attempting. Do not build anything critical on it: it does
        // not fire for most ways a session ends, and it can arrive too late to
        // be useful. "redirectingWithMessage" above is the dependable one.
        case "app.stopped":
            console.log("[E3DS demo] The app has stopped running.");
            logSessionEvent("app.stopped", "The app stopped running.");
            break;

        // The session's time ran out. This demo simply starts a fresh one.
        case "session.expired":
            logSessionEvent("session.expired", "The session's time ran out.");
            hideStreamArea();
            reloadStream();
            break;

        // The video could not be delivered. Reloading gives it another try.
        case "stream.failed":
            logSessionEvent("stream.failed", "The video could not be delivered.");
            hideStreamArea();
            reloadStream();
            break;

        // Something went wrong and the platform is showing its own error page
        // inside the frame. Clear our loading screen so the visitor can read
        // it rather than staring at a spinner that will never finish.
        case "session.error":
            hideLoadingScreen();
            showStreamArea();
            focusStream();
            break;

        /* ── Answers to things this page asked for ────────────────────── */

        /* [E3DS-VIEWER-NOTICE] One line of text for the viewer, sent by the
         * platform when something has happened that they would otherwise have
         * to guess at - mouse lock being armed, for instance.
         *
         * Shown here as a toast on the PARENT page, because that is the only
         * place it can be seen: an integration normally runs with the player's
         * own interface hidden, which suppresses the in-frame version. */
        case "notice":
            showStreamNotice(data.message);
            break;

        /* [E3DS-SCREENSHOT-IFRAME] The frame painted it; this page saves it.
         * A download started inside a cross-origin iframe is refused by Chrome
         * without user activation in that frame, and the click was here, not
         * there. A top-level document has no such restriction. */
        case "screenshot":
            saveStreamScreenshot(data);
            break;

        /* The platform confirming it heard a command, before acting on it.
         * Worth logging: with it, "nothing happened" separates into "the
         * command never arrived" and "it arrived and did not work". */
        case "commandReceived":
            logSessionEvent("commandReceived", data.command);
            break;

        /* [E3DS-VIEWPORT-RES-REPORT] What "Match window resolution" actually
         * did - the flag either side of the change, the size measured, and
         * whether anything was re-sent. Worth reading rather than assuming:
         * "it did not work" has three causes that look identical. */
        case "viewportResolution":
            window.e3dsLogAppResponse(data, data.ok ? "note" : "err",
                "useViewportResolution");
            if (data.error) showStreamNotice(data.error);
            break;

        /* [E3DS-DEVICE-INFO] The documented answer to sendDeviceInfo:
         * { type: "takeUserDeviceInfo", userDeviceInfo: { os, client, device } }.
         * The same message an Unreal app receives when it asks - see
         * learn.eagle3dstreaming.com/wiki/device-detection.
         *
         * Already in the log, like every incoming message, so there is nothing
         * to do here beyond not falling through to the "unrecognised event"
         * warning. Reading it is the whole point of it. */
        case "takeUserDeviceInfo":
            /* [E3DS-RESULT-BOX] Shown on screen when the viewer pressed Device info (not for the panel's own
             * capability check, which asks the same question). */
            if (typeof e3dsShowResultBox === "function" && e3dsShowNextDeviceInfo) {
                e3dsShowNextDeviceInfo = false;
                e3dsShowResultBox("Device info", data.userDeviceInfo || data);
            }
            break;
        case "appInfo":
            break;

        /* [E3DS-EMULATE-KEY] Whether the key was recognised. Already in the log
         * like everything else; the case exists so that a working command does
         * not report itself as an unrecognised event. */
        case "keyEmulated":
            if (!data.ok) {
                window.e3dsLogAppResponse(data.error, "err", "keyEmulated");
            }
            break;



        /* ── Everything else ───────────────────────────────────────────── */

        // A message your app sent that the platform passed straight through.
        case "ResponseFromUE4":
            console.log("[E3DS demo] Your app replied:", data.descriptor);
            break;

        // A keyboard shortcut was pressed inside the stream.
        case "shortCuts":
            console.log("[E3DS demo] A shortcut key was pressed inside the stream.");
            break;

        default:
            // Named rather than silent, on purpose: an unrecognised event is
            // usually a newer platform feature this page has not been updated
            // for, and knowing its name is what makes that fixable.
            console.warn(`[E3DS demo] Unrecognised platform event: "${data.type}"`);
            break;
    }
}

/**
 * Handle a message sent by YOUR OWN Unreal application.
 *
 * This is where your integration's own logic goes. The demo simply displays
 * whatever arrives; a real page would act on it - update a price, move a form
 * to the next step, and so on.
 *
 * @param {object} messageFromApp The parsed object your app sent.
 */
function handleUnrealAppMessage(messageFromApp) {
    if (DEMO_CONFIG.logMessages) {
        console.log("[E3DS demo] app -> page:", messageFromApp);
    }

    /* [E3DS-LOG] Logged by routeIncomingMessage, along with everything else
     * that arrives - not here. One place that sees every message is the only
     * way the log can be trusted to be complete. */

    // `cmd` is whatever name your Unreal app chose to send. These are YOUR
    // names, not the platform's - add a case per message your app sends.
    switch (messageFromApp.cmd) {
        case "increaseSessionExpireTime":
            console.log("[E3DS demo] The app asked to extend the session.");
            break;

        default:
            // Not a warning: your app may legitimately send messages this demo
            // knows nothing about.
            break;
    }
}

/**
 * Decide which of the two senders a message came from, and pass it on.
 *
 * Attached to the window once, at the bottom of this file. Every message from
 * the iframe arrives here first.
 *
 * @param {MessageEvent} event The browser's message event.
 */
function routeIncomingMessage(event) {
    const data = event.data;

    // Messages from the PLATFORM are objects carrying a `type` field.
    if (data && data.type) {
        if (DEMO_CONFIG.logMessages) {
            console.log("[E3DS demo] platform -> page:", data);
        }

        /* [E3DS-LOG] Logged before it is handled, and only for the copy this
         * page acts on. Every lifecycle event arrives up to three times - old
         * name, SDK name, dotted name - and logging all three would treble the
         * log for no information. The dotted copy is the one with `phase`; a
         * message with no legacyType at all is a direct reply
         * or takeUserDeviceInfo, which arrives once.
         *
         * [E3DS-LEGACY-NOTICE] The old-name copy is left out of the log: the player marks it `deprecated: true`
         * and sends the same moment under its current name right after, so the log teaches only the names to use.
         * A player that predates the marker sends old names alone, without it - and those are still logged. */
        if (typeof window.e3dsLogAppResponse === "function"
            && data.deprecated !== true
            && (data.legacyType === undefined || data.phase !== undefined)) {
            window.e3dsLogAppResponse(data, "in", data.type);
        }

        handlePlatformEvent(data);
        return;
    }

    // Messages from YOUR APP arrive as a JSON string containing "cmd".
    //
    // Guarded with a try/catch because this listener sees EVERY postMessage
    // that reaches the page - including ones from browser extensions and other
    // scripts that have nothing to do with streaming. An unparseable message is
    // normal here and must not be allowed to throw.
    if (typeof data === "string" && data.includes("cmd")) {
        try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.cmd) {
                if (typeof window.e3dsLogAppResponse === "function") {
                    window.e3dsLogAppResponse(parsed, "in", "from your app");
                }
                handleUnrealAppMessage(parsed);
            }
        } catch (error) {
            // Not JSON, so not for us. Nothing to do.
        }
    }
}

// Start listening. This single line is what connects everything above to the
// browser; without it, no event in this file would ever run.
window.addEventListener("message", routeIncomingMessage);
