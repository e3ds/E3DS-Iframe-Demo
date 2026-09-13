/**
 * iframe-commands.js — sending instructions TO the streaming app.
 *
 * ── The one idea you need before reading on ────────────────────────────────
 *
 * Your page and the stream live in two separate worlds. The stream runs inside
 * an <iframe>, which the browser deliberately keeps sealed off from the page
 * around it: your code cannot reach inside it, and its code cannot reach out.
 *
 * The one door between them is `postMessage`. You post a message at the iframe;
 * the platform inside it reads that message and acts on it. Everything in this
 * file is a small, friendly wrapper around that single browser feature, so that
 * your own code never has to remember the exact wording of each message.
 *
 * Messages travel in both directions:
 *   - THIS file covers page  ->  app   (commands you send).
 *   - iframe-events.js covers app -> page (events you receive).
 *
 * ── The shape of every command ─────────────────────────────────────────────
 *
 * Every command is a JSON string of the form:
 *
 *     { "cmd": "<command name>", "value": <whatever that command takes> }
 *
 * You do not need to build that by hand - call one of the functions below.
 */

/**
 * Find the <iframe> element that holds the stream.
 *
 * Returns null (rather than throwing) if it is not on the page, so that a
 * mistyped id in iframe-config.js shows up as one clear console warning instead of an
 * unexplained crash somewhere else.
 *
 * @returns {HTMLIFrameElement|null}
 */
function getStreamFrame() {
    const frame = document.getElementById(DEMO_CONFIG.iframeElementId);

    if (!frame) {
        console.warn(
            `[E3DS demo] No element with id "${DEMO_CONFIG.iframeElementId}" was found on the page. ` +
            `Check that "iframeElementId" in js/iframe-config.js matches the id of the <iframe> in index.html.`
        );
        return null;
    }

    return frame;
}

/**
 * Send one command to the streaming app.
 *
 * This is the single place in the demo that actually calls postMessage, so
 * there is exactly one place to look if a command is not arriving.
 *
 * @param {string} commandName  Which command to run, e.g. "sendToUe4".
 * @param {*}      commandValue The data that command expects. May be a plain
 *                              string, a number, or an object - it depends on
 *                              the command, and on what your Unreal app expects.
 */
function sendCommandToStream(commandName, commandValue) {
    const frame = getStreamFrame();
    if (!frame) return;

    const message = { cmd: commandName, value: commandValue };

    if (DEMO_CONFIG.logMessages) {
        console.log("[E3DS demo] page -> app:", message);
    }

    /* [E3DS-LOG] Logged here, once, rather than at each of the twenty callers.
     * Every command this page sends goes through this function, so this is the
     * only place that can promise the log is complete. */
    if (typeof window.e3dsLogAppResponse === "function") {
        window.e3dsLogAppResponse(message, "out");
    }

    // The message must be a STRING, not an object - the platform parses it with
    // JSON.parse on the other side.
    //
    // The "*" is the target origin. It means "I do not mind which address the
    // iframe currently points at". That is correct here because these messages
    // contain no private data. If you ever send something sensitive, replace
    // "*" with the exact origin of your stream URL so the browser refuses to
    // deliver it anywhere else.
    frame.contentWindow.postMessage(JSON.stringify(message), "*");
}

/**
 * Send your own data to the Unreal application itself.
 *
 * This is the command you will use most, and the one that carries your actual
 * integration: whatever you send here is what your Unreal app receives.
 *
 * WHAT TO SEND is entirely up to how your Unreal app was built:
 *
 *   - If it expects a plain piece of text:
 *         sendToUnrealApp("red");
 *
 *   - If it expects structured data:
 *         sendToUnrealApp({ action: "setColour", colour: "red" });
 *
 * Neither is more correct than the other - match whichever your app is
 * listening for. If nothing happens when you call this, that mismatch is the
 * first thing worth checking.
 *
 * @param {string|object} data Whatever your Unreal app expects to receive.
 */
function sendToUnrealApp(data) {
    sendCommandToStream("sendToUe4", data);
}

/**
 * Show or hide one of the platform's own on-screen elements.
 *
 * Use this to hide parts of the default streaming interface you do not want
 * your visitors to see, so the embedded stream blends into your own page.
 *
 * @param {string} elementId    The id of the element to restyle.
 * @param {string} cssProperty  The CSS property to set, e.g. "display".
 * @param {string} cssValue     The value to set it to, e.g. "none".
 */
function setStreamElementStyle(elementId, cssProperty, cssValue) {
    sendCommandToStream("style", {
        id: elementId,
        property: cssProperty,
        value: cssValue
    });
}

/* ── Every command the player accepts from an iframe ────────────────────────
 *
 * The full set, taken from the player's own handler (search
 * the list at learn.eagle3dstreaming.com). Each one below is a working
 * example of a command that already exists on the platform - the page's whole
 * job is to name the command and its value.
 *
 * Three of these are DIFFERENT SHAPES and do not fit sendCommandToStream()'s
 * { cmd, value }: freezeResolutionAt takes x and y, setAdaptiveQualityPoint
 * takes minValue and maxValue, and the microphone setters take a settings
 * object. They are written out in full rather than bent to fit.
 */

/** Press the play button for the viewer, when your page has its own. */
function demoPressPlay() {
    sendCommandToStream("EmulatePlayButtonPressed", "");
}

/**
 * A key the app will see as genuinely pressed and released.
 *
 * [E3DS-EMULATE-KEY] The player dispatches a real KeyboardEvent on its own
 * document, so the key travels the same path a viewer's own keypress travels.
 * The reply is a `keyEmulated` event saying whether the key was recognised -
 * worth watching, because an unrecognised name is the one failure mode here.
 *
 * Any single letter or digit works, as do Space, Enter, Escape, Tab, Backspace,
 * Shift, Control, Alt and the four arrows.
 */
function demoPressKey(key) {
    sendCommandToStream("emulateKeyboardKeyPress", key || "M");
}

/** Hold a key down, and release it separately - for movement, not typing. */
function demoHoldKey(key)    { sendCommandToStream("emulateKeyboardKeyDown", key || "W"); }
function demoReleaseKey(key) { sendCommandToStream("emulateKeyboardKeyUp",   key || "W"); }

/**
 * A named quality level: "low", "medium", "high" or "ultra".
 *
 * [E3DS-DEMO-PARITY] SENT UNDER BOTH NAMES, deliberately.
 *
 * The command is called setVideoDetailLevel on the production player and
 * setQualityPreset on the development one - the same function underneath, one
 * of them renamed to match the SDK's e3ds_controller.setVideoDetailLevel. A
 * page cannot ask which it is talking to.
 *
 * An unrecognised cmd falls off the end of the player's dispatcher in silence,
 * so sending both costs one ignored message and works against either. The
 * alternative - picking one - is a demo that silently does nothing on half the
 * deployments, which is the failure this whole pass has been about.
 *
 * When the two players agree on a name again, delete the other line.
 */
function demoQualityPreset(preset) {
    const level = preset || "high";
    sendCommandToStream("setVideoDetailLevel", level);
    sendCommandToStream("setQualityPreset", level);
}

/** A fixed quality point - one number, no adaptation. */
function demoQualityPoint(value) {
    sendCommandToStream("setQualityPoint", String(value == null ? 30 : value));
}

/**
 * A quality RANGE the platform may move within.
 *
 * Two fields, not one, so it does not go through sendCommandToStream().
 */
function demoAdaptiveQuality(minValue, maxValue) {
    const frame = getStreamFrame();
    if (!frame) return;
    const message = {
        cmd: "setAdaptiveQualityPoint",
        minValue: String(minValue == null ? 20 : minValue),
        maxValue: String(maxValue == null ? 40 : maxValue)
    };
    if (DEMO_CONFIG.logMessages) console.log("[E3DS demo] page -> app:", message);
    frame.contentWindow.postMessage(JSON.stringify(message), "*");
}

/** How the mouse drives the camera: "Hovering" or "Locked". */
function demoMouseScheme(scheme) {
    sendCommandToStream("switchMouseControlSchemeTo", scheme || "Hovering");
}

/** Turn touch input on or off - useful when your own UI overlays the stream. */
/* Kept as a worked example, not wired to a button - see the note in
 * demo-ui-panel.js for why the panel does not offer this one. */
function demoTouchInput(enabled) {
    sendCommandToStream("setTouchInputEnabled", enabled ? "true" : "false");
}

/** Structured data to the app. sendToUe4 and sendDataToUE are the older names
 *  for the same door; all three are accepted.
 *
 *  sendCommandToUE is NOT one of them, whatever the name suggests - it goes to
 *  emitCommand, the plugin's own Resolution/ConsoleCommand channel, and never
 *  reaches your app's handler. See demoSendAppCommand below. */
function demoSendData(value) {
    sendCommandToStream("sendDataToUE", value || '{"hello":"from the page"}');
}

/**
 * A message your app has defined for itself, rather than a console command.
 *
 * [E3DS-APP-MESSAGE-PIPE] SENT WITH sendDataToUE, NOT sendCommandToUE - and the
 * difference is not cosmetic, which is what made this hard to see.
 *
 * The two names go to two different Pixel Streaming APIs:
 *
 *   sendDataToUE     -> emitUIInteraction(...)  the UI-interaction channel.
 *                       This is what an app's own message handler receives.
 *   sendCommandToUE  -> emitCommand(...)        the Command channel, which the
 *                       plugin consumes ITSELF for Resolution, ConsoleCommand
 *                       and encoder settings. It never reaches your app's
 *                       handler at all.
 *
 * emitCommand also takes an OBJECT (see PixelStreaming.ts:
 * `public emitCommand(descriptor: object)`), and this was handing it a string,
 * so it was malformed on top of being the wrong channel. Two failures, and
 * neither one reports anything: "ask app for device info, nothing is arriving,
 * response is totally empty".
 *
 * The comment above this function used to claim all three names were "three
 * names for the same door". sendToUe4 and sendDataToUE are; sendCommandToUE is
 * a different door.
 */
function demoSendAppCommand(value) {
    const payload = value || '{"hello":"from the page"}';
    sendCommandToStream("sendDataToUE", payload);

    /* The send itself is logged by sendCommandToStream. This adds the one thing
     * the log cannot know: that silence afterwards is normal unless your build
     * happens to listen for this message. */
    if (typeof window.e3dsLogAppResponse === "function") {
        window.e3dsLogAppResponse(null, "note",
            "a reply follows only if your Unreal build handles this");
    }
}

/**
 * End the session and release the machine.
 *
 * Logged on the way out so that the response panel shows the attempt. The
 * player acknowledges the command before it acts on it, so a `commandReceived`
 * entry appearing under this one means the command arrived - and its absence
 * means it did not.
 */
function demoTerminateSession() {
    sendCommandToStream("ForceEndSession", "");
}

/**
 * Ask the platform about the viewer's device.
 *
 * [E3DS-DEVICE-INFO] `sendDeviceInfo` is a long-standing, documented platform
 * command - see learn.eagle3dstreaming.com/wiki/device-detection. It was only
 * ever reachable from inside the Unreal app; a page can send it too now, and
 * the reply comes back in exactly the shape the documentation describes:
 *
 *     { type: "takeUserDeviceInfo", userDeviceInfo: { os, client, device } }
 *
 * Same command, same reply, whoever asks. That is deliberate - a second name
 * for the same question would mean two vocabularies to learn and only one of
 * them written down.
 */
function demoGetDeviceInfo() {
    sendCommandToStream("sendDeviceInfo", "");
}

/**
 * Ask the browser for the microphone, from THIS page.
 *
 * [E3DS-MIC-PERMISSION] THE PARENT HAS TO BE THE ONE TO ASK, and this is the
 * piece that was missing.
 *
 * A permission belongs to the TOP-LEVEL origin, not to the frame. `allow=
 * "microphone"` lets this page share a permission it has with the frame - it
 * does not let the frame go and get one. And a cross-origin frame asking on its
 * own, with no click of its own to point at, is refused outright: the player
 * calls getUserMedia when the session connects, which is a timer as far as the
 * browser is concerned, and the answer comes back NotAllowedError with no
 * prompt ever shown. Observed exactly that way - "Mic permission:
 * NotAllowedError" while this page's own permission state still read "prompt",
 * meaning nobody had ever been asked.
 *
 * Asking from here fixes it because this call has what the frame's did not: a
 * real click, on the top-level document. The prompt appears, the answer is
 * recorded against this origin, and from then on the frame inherits it through
 * `allow`.
 *
 * The track is stopped immediately. This is a request for permission, not for
 * audio - leaving it running would put a recording indicator in the tab for a
 * microphone nothing is listening to.
 */
async function demoRequestMicPermission(quiet) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        window.e3dsLogAppResponse("this browser has no getUserMedia", "err", "microphone");
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());

        /* Called as a precaution before a reload, this is not the thing the
         * viewer pressed a button for - so it says nothing unless it failed. A
         * refusal still matters, because it explains a stream that arrives
         * without a microphone. */
        if (quiet) return true;

        window.e3dsLogAppResponse(
            "granted to " + e3dsThisSite() + " (this page). " + e3dsStreamSite()
            + " (the stream) is a different site with its own permission - this "
            + "grant is meant to cover it through allow=\"microphone\", and the "
            + "next lines say whether it did.",
            "note", "microphone permission");
        return true;
    } catch (e) {
        const name = (e && e.name) ? e.name : String(e);
        window.e3dsLogAppResponse(
            name === "NotAllowedError"
                ? "refused by " + e3dsThisSite() + " (this page). Only you can undo "
                  + "this, in the padlock menu beside the address bar - no attribute "
                  + "or command can override it."
                : "refused by " + e3dsThisSite() + " (this page): " + name,
            "err", "microphone permission");
        return false;
    }
}

/**
 * List the microphones, as the FRAME sees them.
 *
 * [E3DS-MIC-DEVICE] It has to be the frame that enumerates them: a deviceId is
 * scoped to the origin that produced it, so ids this page collected would be
 * meaningless inside the stream.
 *
 * The reply is a `micDevices` event carrying { ok, devices, error }, where each
 * device is { deviceId, label, isActive }. Labels are empty until the browser
 * has granted the microphone once - so a list of blanks means the permission
 * has not been given yet, not that the devices have no names.
 */
function demoListMicDevices() {
    sendCommandToStream("getMicDevices", "");
}

/**
 * Capture from a different microphone, without dropping the session.
 *
 * [E3DS-MIC-DEVICE] The switch happens inside the frame with replaceTrack(), so
 * there is no renegotiation and the call continues. Sent with `deviceId` at the
 * top level, which is the documented shape.
 *
 * The reply is a `micDeviceChanged` event: { ok, deviceId, label, error }.
 *
 * @param {string} deviceId one of the ids from demoListMicDevices()
 */
function demoSetMicDevice(deviceId) {
    const frame = getStreamFrame();
    if (!frame || !deviceId) return;

    const message = { cmd: "setMicDevice", deviceId: deviceId };
    if (DEMO_CONFIG.logMessages) console.log("[E3DS demo] page -> app:", message);
    if (typeof window.e3dsLogAppResponse === "function") {
        window.e3dsLogAppResponse(message, "out");
    }
    frame.contentWindow.postMessage(JSON.stringify(message), "*");
}

/* THREE FUNCTIONS WERE REMOVED FROM HERE, and it is worth saying why rather
 * than leaving a gap.
 *
 * demoMicInitial, demoMicRuntime and demoMicReport sent
 * setInitialMicrophoneSettings, setRuntimeMicrophoneSettings and
 * getMicrophoneSettings. No player build implements any of the three - they
 * appear nowhere in the platform, only here. So they were three more commands
 * that looked available and did nothing, in a file whose whole job is to show
 * an integrator what the bridge can do.
 *
 * The microphone commands that DO exist are the two above, and they are the two
 * that were built and tested against a real device.
 */

/**
 * Run an Unreal console command inside the running app.
 *
 * This is the same console you would type into with the tilde key in the
 * editor, so anything the app accepts there works here - `stat fps`,
 * `stat unit`, `r.ScreenPercentage 50`, and so on.
 *
 * WORTH UNDERSTANDING BEFORE YOU SHIP IT. The command runs with the app's own
 * privileges on the machine streaming to this viewer. Exposing a free-text box
 * to the public means letting anyone run any console command your build
 * responds to. In your own page, send the specific commands you intend rather
 * than whatever a visitor types - the input in this demo exists to show the
 * mechanism, not as a pattern to copy.
 *
 * @param {string} command The console command, e.g. "stat fps".
 */
function sendUnrealConsoleCommand(command) {
    const text = String(command == null ? "" : command).trim();
    if (!text) return;

    sendCommandToStream("sendConsoleCommandToUE", text);
}

/**
 * Toggle Unreal's on-screen FPS counter.
 *
 * `stat fps` is a toggle rather than an "on" switch: sending it again turns the
 * counter off. That is Unreal's behaviour, not something this demo adds.
 */
function toggleUnrealFpsCounter() {
    sendUnrealConsoleCommand("stat fps");
}

/**
 * Lock the stream to a fixed resolution.
 *
 * By default the stream follows the size of the iframe. Pinning it is useful
 * when you need a predictable image size regardless of the browser window -
 * for example when capturing screenshots, or to reduce load by streaming fewer
 * pixels than the window would otherwise ask for.
 *
 * Note this command takes its two numbers as separate `x` and `y` fields rather
 * than the usual single `value`, which is why it does not go through
 * sendCommandToStream().
 *
 * @param {number} width  Width in pixels.
 * @param {number} height Height in pixels.
 */
function freezeStreamResolution(width, height) {
    const frame = getStreamFrame();
    if (!frame) return;

    const message = { cmd: "freezeResolutionAt", x: width, y: height };

    if (DEMO_CONFIG.logMessages) {
        console.log("[E3DS demo] page -> app:", message);
    }

    frame.contentWindow.postMessage(JSON.stringify(message), "*");
}

/**
 * Give keyboard focus to the stream.
 *
 * WHY THIS MATTERS, because it is the single most common thing people get
 * caught out by: a browser sends key presses only to whichever element is
 * currently focused. If your visitor clicks anywhere on your page outside the
 * stream, focus moves away and the app silently stops receiving typing - the
 * picture keeps moving, so it looks like the app has frozen or ignored input
 * rather than like a focus problem.
 *
 * Call this whenever you want typing to go to the app again. This demo calls it
 * when the page is clicked, and whenever the platform asks for it (see the
 * "_focus" event in iframe-events.js).
 */
function focusStream() {
    const frame = getStreamFrame();
    if (frame) frame.focus();
}

/**
 * Hand resolution control back to the window.
 *
 * The opposite of freezeStreamResolution(): the stream stops being pinned to a
 * fixed size and follows the frame again, which is the default behaviour.
 *
 * SDK equivalent: e3ds_controller.useViewportResolution()
 *
 * The player answers with a `viewportResolution` event saying whether anything
 * was actually re-sent - see iframe-events.js, which logs it either way. That
 * reply is worth reading: "nothing happened" and "nothing needed to happen"
 * look identical from out here.
 */
function demoUseViewportResolution() {
    sendCommandToStream("useViewportResolution");
}

/**
 * Restart the stream by reloading the iframe.
 *
 * Used when a session has ended and you want to offer a fresh one, rather than
 * leaving the visitor looking at a dead frame.
 */
async function reloadStream() {
    const frame = getStreamFrame();
    if (!frame) return;

    /* [E3DS-MIC-ASK-FIRST] Ask for the microphone HERE, inside the click, before
     * the frame reloads.
     *
     * The player asks for it itself when WebRTC sets up, seconds later - and by
     * then the activation from this click has expired. Chrome refuses a
     * cross-origin frame's request without activation and does not prompt at
     * all: no dialog, no Microphone row in the padlock, no usage recorded.
     * Firefox has no such rule, which is why the same page works there.
     *
     * Asking now puts the prompt inside the live activation. The answer is
     * stored against this top-level origin, and the frame's later request is
     * then using a permission that already exists.
     *
     * Only when the frame is allowed a microphone at all - asking for one the
     * page has no intention of delegating would be a prompt for nothing. */
    if (frame.getAttribute("allow") &&
        frame.getAttribute("allow").indexOf("microphone") !== -1) {
        await demoRequestMicPermission(true);
    }

    /* [E3DS-FRAME-GESTURE] SYNCHRONOUS, so that when this is called from a
     * button the navigation still carries that click's user activation. A frame
     * navigated from a gesture can ask for a microphone; one navigated from a
     * timer cannot, and the refusal is silent. Never wrap this in a timeout to
     * "let things settle". */

    // Assigning src back to itself is the ordinary way to force an iframe to
    // reload. It looks odd, but it is deliberate and it works in every browser.
    // eslint-disable-next-line no-self-assign
    frame.src = frame.src;
}

/**
 * Tell the platform that it is running inside an iframe.
 *
 * The platform asks for this itself (see the "isIframe" event in
 * iframe-events.js); you should not need to call it yourself. It lets the
 * platform adjust behaviour that differs between a normal tab and an embed.
 */
function confirmRunningInIframe() {
    focusStream();
    sendCommandToStream("isIframe", true);
}
