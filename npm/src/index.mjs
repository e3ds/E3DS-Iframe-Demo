/**
 * __PKG_NAME__ __PKG_VERSION__
 *
 * Embed an Eagle 3D Streaming application in an <iframe> and talk to it in both
 * directions with postMessage - the same wire format the iframe demo uses
 * (github.com/e3ds/E3DS-Iframe-Demo, js/iframe-commands.js and js/iframe-events.js),
 * packaged as one small object. No API key, no dependencies.
 *
 *   page -> app : every command is the STRING JSON.stringify({ cmd, value })
 *   app  -> page: platform events arrive as objects with a `type`
 *                 ("session.queued", "stream.playing", ...); your Unreal app's
 *                 own messages arrive as JSON strings carrying a `cmd`.
 *
 * [E3DS-NPM-IFRAME] grep tag.
 */

export const PACKAGE_NAME = "__PKG_NAME__";
export const VERSION = "__PKG_VERSION__";

/* Older players name some events differently. They are translated to the
 * current names here, so a page only ever deals with the current ones. */
const CURRENT_NAME = {
    /* The player's own table (sendToIframe in the player build). */
    stage1_inqueued: "session.queued",
    QueueNumberUpdated: "session.queuePositionChanged",
    stage2_deQueued: "session.hostFound",
    stage3_slotOccupied: "session.hostReserved",
    stage3_1_AppAcquiringProgress: "build.acquiring",
    stage3_2_AppPreparationProgress: "build.preparing",
    stage4_playBtnShowedUp: "stream.ready",
    readyToReceiveMessage: "e3ds.listening",
    bidirectionalChannelBetweenUnrealAndIframeReady: "build.listening",
    stage5_playBtnPressed: "stream.playing",
    redirectingWithMessage: "session.ending",
    handleStreamerDisconnected: "build.stopped",
    sessionExpired: "session.expired",
    videoStreamFailed: "stream.failed",
    Error_Redirect: "session.error"
};

/* Progress events repeat by design; everything else is announced once. The
 * player can send the same moment twice (current and older name), so a repeat
 * within this window is dropped. */
const REPEATING = new Set(["session.queuePositionChanged", "build.acquiring", "build.preparing", "connection.stats"]);
const SAME_EVENT_MS = 3000;

function iframeError(message, err) {
    if (typeof window !== "undefined" && typeof window.e3ds_error === "function") window.e3ds_error(message, err);
    else console.error(message, err === undefined ? "" : err);
}

function resolveElement(target, what) {
    if (!target) return null;
    if (typeof target === "string") {
        const el = document.querySelector(target);
        if (!el) throw new Error("[E3DS] " + what + ': nothing on the page matches "' + target + '"');
        return el;
    }
    return target;
}

/**
 * Embed a stream, or take over an <iframe> already on the page.
 *
 * @param {object} options
 * @param {string} [options.url] The stream address from your Control Panel,
 *        https://<connector>.eagle3dstreaming.com/v5/<owner>/<AppName>/<configuration>
 * @param {string|HTMLElement} [options.container] Where to create the iframe.
 * @param {string|HTMLIFrameElement} [options.iframe] An existing iframe to use instead.
 * @param {string[]} [options.allow] Permissions for the frame. Default ["fullscreen"].
 *        Add "microphone" only if the app uses one - it costs every visitor a prompt.
 * @param {boolean} [options.autoFocus=true] Keep keyboard focus on the stream when the player asks for it.
 * @param {boolean} [options.log=false] Print every message to the console.
 * @param {string} [options.targetOrigin="*"] Restrict which origin may receive your commands.
 */
export function createE3dsIframe(options = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("[E3DS] createE3dsIframe() runs in a browser.");
    }
    const log = !!options.log;
    const autoFocus = options.autoFocus !== false;
    const targetOrigin = options.targetOrigin || "*";

    let iframe = resolveElement(options.iframe, "options.iframe");
    let created = false;
    if (!iframe) {
        const container = resolveElement(options.container, "options.container");
        if (!container) throw new Error("[E3DS] createE3dsIframe(): give options.container or options.iframe");
        iframe = document.createElement("iframe");
        iframe.title = options.title || "Eagle 3D Streaming application";
        iframe.style.border = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        container.appendChild(iframe);
        created = true;
    }
    const allow = options.allow || ["fullscreen"];
    if (allow.length) iframe.setAttribute("allow", allow.map((p) => (p.indexOf(" ") < 0 ? p + " *" : p)).join("; "));
    iframe.setAttribute("allowfullscreen", "");

    const listeners = new Map();
    const lastSeen = {};

    function emit(type, payload) {
        for (const key of [type, "*"]) {
            const set = listeners.get(key);
            if (!set) continue;
            for (const fn of Array.from(set)) {
                try {
                    fn(payload, type);
                } catch (e) {
                    iframeError("[E3DS-NPM-IFRAME] a \"" + type + "\" listener threw:", e);
                }
            }
        }
    }

    function post(message) {
        if (!iframe.contentWindow) {
            iframeError("[E3DS-NPM-IFRAME] the iframe has no window yet - command not sent:", message);
            return false;
        }
        if (log) console.log("[E3DS] page -> app:", message);
        /* A STRING, not an object: the player reads it with JSON.parse. */
        iframe.contentWindow.postMessage(JSON.stringify(message), targetOrigin);
        return true;
    }

    function send(cmd, value) {
        return post(value === undefined ? { cmd } : { cmd, value });
    }

    function focus() {
        try {
            iframe.focus();
        } catch (e) {
            iframeError("[E3DS-NPM-IFRAME] focusing the stream failed:", e);
        }
    }

    function onPlatformEvent(raw) {
        /* Copies the player sends under an older name, marked as such. */
        if (raw.deprecated === true) return;
        if (raw.legacyType !== undefined && raw.phase === undefined) return;
        const type = CURRENT_NAME[raw.type] || raw.type;
        const data = type === raw.type ? raw : Object.assign({}, raw, { type });

        if (!REPEATING.has(type)) {
            const now = Date.now();
            if (now - (lastSeen[type] || 0) < SAME_EVENT_MS) return;
            lastSeen[type] = now;
        }

        /* The two handshakes every embed needs, answered here so no page has to. */
        if (type === "isIframe") {
            if (autoFocus) focus();
            send("isIframe", true);
        } else if (type === "_focus" || type === "stream.playing") {
            if (autoFocus) focus();
        }

        if (type === "ResponseFromUE4") {
            emit("appMessage", data.descriptor);
        }
        emit(type, data);
    }

    function onMessage(event) {
        if (event.source && iframe.contentWindow && event.source !== iframe.contentWindow) return;
        const data = event.data;
        if (data && typeof data === "object" && data.type) {
            if (log) console.log("[E3DS] platform -> page:", data);
            onPlatformEvent(data);
            return;
        }
        if (typeof data === "string" && data.indexOf("cmd") >= 0) {
            let parsed = null;
            try {
                parsed = JSON.parse(data);
            } catch (e) {
                console.warn("[E3DS-NPM-IFRAME] a message mentioning cmd was not JSON and was ignored:", e && e.message);
                return;
            }
            if (parsed && parsed.cmd) {
                if (log) console.log("[E3DS] app -> page:", parsed);
                emit("appMessage", parsed);
            }
        }
    }

    window.addEventListener("message", onMessage);
    if (options.url) iframe.src = options.url;

    const api = {
        /** The <iframe> element. */
        iframe,

        /** Listen for an event: a platform event name ("stream.playing", "session.ending", ...),
         *  "appMessage" for your Unreal app's own messages, or "*" for everything. Returns an unsubscribe function. */
        on(type, fn) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(fn);
            return () => api.off(type, fn);
        },
        off(type, fn) {
            const set = listeners.get(type);
            if (set) set.delete(fn);
        },
        /** Like on(), but only the next time. */
        once(type, fn) {
            const off = api.on(type, (d, t) => {
                off();
                fn(d, t);
            });
            return off;
        },

        /** Any command the player accepts, sent as { cmd, value }. */
        send,

        /** Your own data to your Unreal app (what it receives through Pixel Streaming). */
        sendMessageToStreamingBuild: (data) => send("sendMessageToStreamingBuild", data),
        /** An Unreal console command, e.g. "stat fps". Do not pass visitor-typed text straight through. */
        sendConsoleCommand: (command) => send("sendConsoleCommandToUE", String(command == null ? "" : command).trim()),
        /** "low" | "medium" | "high" | "ultra". */
        setVideoDetailLevel(level) {
            const l = level || "high";
            /* Sent under both of the names players have used for it; the one a player does not know is ignored. */
            send("setVideoDetailLevel", l);
            send("setQualityPreset", l);
        },
        /** 0..1 (or 0..100). */
        setVolume: (volume) => send("setVolume", volume),
        /** "Hovering" or "Locked". */
        switchMouseControlSchemeTo: (scheme) => send("switchMouseControlSchemeTo", scheme),
        setTouchInputEnabled: (enabled) => send("setTouchInputEnabled", enabled ? "true" : "false"),
        /** Press and release a key the app sees as real, e.g. "M", "Space", "Enter", "ArrowUp". */
        pressKey: (key) => send("emulateKeyboardKeyPress", key),
        keyDown: (key) => send("emulateKeyboardKeyDown", key),
        keyUp: (key) => send("emulateKeyboardKeyUp", key),
        /** Press the play button for the viewer, when your page has its own. */
        pressPlay: () => send("EmulatePlayButtonPressed", ""),
        /** Pin the stream to a fixed resolution. */
        freezeResolution: (width, height) => post({ cmd: "freezeResolutionAt", x: width, y: height }),
        /** Follow the frame's size again (the default). Answered by a "viewportResolution" event. */
        useViewportResolution: () => send("useViewportResolution"),
        /** Take a screenshot. Answered by a "screenshot" event: { ok, dataUrl, fileName, width, height }. */
        captureScreenshot: () => send("captureScreenShot"),
        /** Answered by a "takeUserDeviceInfo" event. */
        getDeviceInfo: () => send("sendDeviceInfo", ""),
        /** Answered by an "appInfo" event. */
        getAppInfo: () => send("getAppInfo", ""),
        /** List the microphones the stream can see. Answered by a "micDevices" event. */
        getMicDevices: () => send("getMicDevices"),
        /** Capture this microphone. Answered by a "micDeviceChanged" event. */
        setMicDevice: (deviceId) => send("setMicDevice", deviceId),
        /** End the session and release the machine. */
        terminateSession: () => send("ForceEndSession", ""),

        /** Give keyboard focus to the stream. */
        focus,
        /** Start a fresh session in the same frame. Call it from a click so the browser keeps the user gesture. */
        reload() {
            // eslint-disable-next-line no-self-assign
            iframe.src = iframe.src;
        },
        /** Point the frame at another stream. */
        setUrl(url) {
            iframe.src = url;
        },
        /** Stop listening, and remove the iframe if this object created it. */
        destroy() {
            window.removeEventListener("message", onMessage);
            listeners.clear();
            if (created && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }
    };
    return api;
}

export default { createE3dsIframe, VERSION, PACKAGE_NAME };
