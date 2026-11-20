/* [E3DS-UNITY-IFRAME] Unity iframe demo - the whole page logic. Plain JavaScript, no build step.
 *
 * Two directions, one browser feature (postMessage):
 *   page  -> Unity : postMessage(JSON.stringify({ cmd: <send command>, value: { id, action, ... } }))
 *                    The player hands `value` (as JSON text) to the Unity app's E3dsPageChannel.
 *   Unity -> page  : the app sends JSON with a "cmd" ("unity.ready", "unity.objectClicked", ...); the player posts it
 *                    to this page - as the JSON text and, on some players, also as the parsed object. Every app
 *                    message carries a running "seq", so the copy is recognised and shown once.
 *   player -> page : the player's own events ({ type: "stream.playing" } etc.).
 */
(function () {
    "use strict";

    var DEFAULT_STREAM = "https://stream.eagle3dstreaming.com/v5/demo/E3DS_UnityIframeDemo/Project_E3DS_UnityIframeDemo";
    var params = new URLSearchParams(location.search);
    var DEBUG = params.get("debug") === "1"; // ?debug=1 also lists every player event the page does not use

    var $ = function (id) { return document.getElementById(id); };
    var frame = $("stream");
    var urlInput = $("urlInput");
    urlInput.value = params.get("url") || DEFAULT_STREAM;

    var state = { running: false, appReady: false, modernPlayer: false, seen: new Set(), nextId: 1, pings: {}, clicks: 0 };

    /* ---------------------------------------------------------------- log */
    function log(dir, text, detail) {
        var li = document.createElement("li");
        li.className = "e " + dir;
        var t = new Date();
        var stamp = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0") + ":" + String(t.getSeconds()).padStart(2, "0");
        var label = { out: "page → app", app: "app → page", player: "player", note: "page" }[dir] || dir;
        li.innerHTML = '<span class="ts"></span><span class="dir"></span><span class="txt"></span>';
        li.children[0].textContent = stamp;
        li.children[1].textContent = label;
        li.children[2].textContent = text + (detail ? "  " + detail : "");
        var ol = $("log");
        ol.insertBefore(li, ol.firstChild);
        while (ol.children.length > 200) ol.removeChild(ol.lastChild);
    }

    function setStatus(s, text) {
        var el = $("status");
        el.dataset.state = s;
        el.textContent = text;
    }

    function setAppReady(ready) {
        state.appReady = ready;
        var box = $("appControls");
        box.setAttribute("aria-disabled", ready ? "false" : "true");
        box.querySelectorAll("button, input").forEach(function (b) { b.disabled = !ready; });
        $("appState").textContent = ready ? "connected" : (state.running ? "waiting for the app" : "start the stream first");
        $("appState").dataset.on = ready ? "1" : "0";
    }

    /* ------------------------------------------------------- page -> Unity */
    function post(message) {
        if (!frame.contentWindow) { log("note", "no stream window yet - not sent"); return false; }
        // A STRING, not an object: the player reads it with JSON.parse.
        frame.contentWindow.postMessage(JSON.stringify(message), "*");
        return true;
    }

    /* Send one action to the Unity app. The player on stream.eagle3dstreaming.com (where Unity apps stream) takes
     * "sendDataToUE" today; newer players take "sendMessageToStreamingBuild" and announce themselves by sending the
     * dotted lifecycle events (session.queued, stream.playing ...). The page picks the name by what it has seen, so
     * each message is sent once. */
    function sendToApp(action, extra) {
        var id = "p" + state.nextId++;
        var value = Object.assign({ id: id, action: action }, extra || {});
        var cmd = state.modernPlayer ? "sendMessageToStreamingBuild" : "sendDataToUE";
        if (post({ cmd: cmd, value: value })) log("out", action, JSON.stringify(value));
        return id;
    }

    /* ------------------------------------------------------- Unity -> page */
    function onAppMessage(m) {
        switch (m.cmd) {
            case "unity.ready":
                setAppReady(true);
                setStatus("playing", "Playing");
                log("app", "unity.ready", m.app + ", Unity " + m.unityVersion + ", " + m.screen);
                try { frame.focus(); } catch (e) { console.error("[E3DS-UNITY-IFRAME] focusing the stream failed:", e); }
                break;
            case "unity.ack":
                log("app", "unity.ack", m.action + (m.ok ? " - done" : " - FAILED: " + m.error));
                break;
            case "unity.pong":
                var sent = state.pings[m.id];
                if (sent) { var ms = Math.round(performance.now() - sent); $("cRtt").textContent = ms + " ms"; delete state.pings[m.id]; log("app", "unity.pong", ms + " ms round trip"); }
                break;
            case "unity.state":
                log("app", "unity.state", "shape " + m.shape + ", colour " + m.color + ", spin " + m.spin + "°/s, " + m.light + ', banner "' + m.text + '"');
                break;
            case "unity.objectClicked":
                $("cClicks").textContent = m.clicks;
                $("cClicksSub").textContent = "last: " + m.shape + " " + m.color;
                flash("cClicks");
                log("app", "unity.objectClicked", m.shape + " " + m.color + " (click " + m.clicks + ")");
                break;
            case "unity.buttonClicked":
                $("cButton").textContent = m.count;
                flash("cButton");
                log("app", "unity.buttonClicked", "pressed " + m.count + "x inside the app");
                break;
            case "unity.stats":
                $("cFps").textContent = m.fps;
                if (DEBUG) log("app", "unity.stats", m.fps + " fps, up " + m.uptime + " s");
                break;
            default:
                log("app", m.cmd, JSON.stringify(m));
        }
    }

    function flash(id) {
        var el = $(id).parentNode;
        el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    }

    /* ------------------------------------------------------ player -> page */
    var PLAYER_EVENTS = {
        "session.queued": function (d) { setStatus("wait", "In queue" + (d.queuePosition ? " (" + d.queuePosition + ")" : "")); },
        "session.queuePositionChanged": function (d) { setStatus("wait", "In queue (" + d.queuePosition + ")"); },
        "session.hostFound": function () { setStatus("wait", "Machine found"); },
        "session.hostReserved": function () { setStatus("wait", "Machine reserved"); },
        "build.acquiring": function () { setStatus("wait", "Getting the app"); },
        "build.preparing": function () { setStatus("wait", "Preparing the app"); },
        "build.started": function () { setStatus("wait", "App starting"); },
        "stream.ready": function () { setStatus("wait", "Connecting video"); },
        "stream.playing": function () { setStatus("playing", "Playing"); },
        "session.ending": ended, "sessionEnding": ended, "session.expired": ended,
        "build.stopped": function () { ended({ message: "The app stopped" }); },
        "stream.failed": function (d) { setStatus("error", "Stream failed"); log("player", "stream.failed", d.message || ""); },
        "session.error": function (d) { setStatus("error", "Error"); log("player", "session.error", d.message || ""); }
    };

    function ended(d) {
        if (!state.running) return;
        state.running = false;
        setAppReady(false);
        setStatus("ended", "Session ended");
        $("endBtn").disabled = true;
        $("fullBtn").disabled = true;
        $("startBtn2").disabled = false;
        log("player", "session ended", (d && d.message) || "");
    }

    window.addEventListener("message", function (event) {
        // only messages from OUR stream frame
        if (event.source !== frame.contentWindow) return;
        var d = event.data;
        if (typeof d === "string") {
            if (d.indexOf("cmd") < 0) return;
            try { d = JSON.parse(d); } catch (e) { console.warn("[E3DS-UNITY-IFRAME] a message mentioning cmd was not JSON:", e.message); return; }
        }
        if (!d || typeof d !== "object") return;
        if (d.type === "ResponseFromUE4" && d.descriptor) {
            try { d = typeof d.descriptor === "string" ? JSON.parse(d.descriptor) : d.descriptor; }
            catch (e) { console.warn("[E3DS-UNITY-IFRAME] app message was not JSON:", e.message); return; }
        }
        if (typeof d.cmd === "string" && d.cmd.indexOf("unity.") === 0) {
            if (d.seq !== undefined) { if (state.seen.has(d.seq)) return; state.seen.add(d.seq); }
            onAppMessage(d);
            return;
        }
        if (typeof d.type === "string") {
            if (/^(session|build|stream)\./.test(d.type)) state.modernPlayer = true;
            var h = PLAYER_EVENTS[d.type];
            if (h) { if (d.type !== "sessionEnding") log("player", d.type, d.queuePosition ? "position " + d.queuePosition : ""); h(d); }
            else if (DEBUG) log("player", d.type, JSON.stringify(d).slice(0, 160));
        }
    });

    /* ------------------------------------------------------------ session */
    function start() {
        var url = urlInput.value.trim();
        if (!/^https:\/\//.test(url)) { log("note", "the stream address must start with https://"); return; }
        state.running = true;
        state.seen = new Set();
        state.modernPlayer = false;
        setAppReady(false);
        $("startOverlay").hidden = true;
        $("startBtn2").disabled = true;
        $("endBtn").disabled = false;
        $("fullBtn").disabled = false;
        ["cClicks", "cButton"].forEach(function (id) { $(id).textContent = "0"; });
        $("cFps").textContent = "-"; $("cRtt").textContent = "-";
        setStatus("wait", "Starting");
        log("note", "starting the stream", url);
        frame.src = url;
    }

    function endSession() {
        // Leaving the stream page closes its connection; the server ends the session and frees the machine.
        frame.src = "about:blank";
        ended({ message: "closed by this page" });
        $("startOverlay").hidden = false;
    }

    $("startBtn").addEventListener("click", start);
    $("startBtn2").addEventListener("click", start);
    $("endBtn").addEventListener("click", endSession);
    $("fullBtn").addEventListener("click", function () {
        var el = $("frameWrap");
        var req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!req) { log("note", "this browser cannot show the stream fullscreen"); return; }
        Promise.resolve(req.call(el)).catch(function (e) { console.error("[E3DS-UNITY-IFRAME] fullscreen refused:", e); log("note", "fullscreen refused by the browser", e.message); });
    });
    $("clearLog").addEventListener("click", function () { $("log").innerHTML = ""; });

    /* ------------------------------------------------------- app controls */
    document.querySelectorAll(".swatch").forEach(function (b) {
        b.addEventListener("click", function () { sendToApp("setColor", { value: b.dataset.color }); });
    });
    $("colorPick").addEventListener("change", function (e) { sendToApp("setColor", { value: e.target.value }); });
    document.querySelectorAll("[data-shape]").forEach(function (b) {
        b.addEventListener("click", function () { sendToApp("setShape", { value: b.dataset.shape }); });
    });
    document.querySelectorAll("[data-light]").forEach(function (b) {
        b.addEventListener("click", function () { sendToApp("setLight", { value: b.dataset.light }); });
    });
    var spinTimer = null;
    $("spin").addEventListener("input", function (e) {
        $("spinOut").textContent = e.target.value;
        clearTimeout(spinTimer);
        spinTimer = setTimeout(function () { sendToApp("setSpin", { number: Number(e.target.value) }); }, 150);
    });
    function sendBanner() {
        var t = $("bannerText").value.trim();
        if (t) sendToApp("showText", { value: t });
    }
    $("bannerBtn").addEventListener("click", sendBanner);
    $("bannerText").addEventListener("keydown", function (e) { if (e.key === "Enter") sendBanner(); });
    $("pingBtn").addEventListener("click", function () { var id = sendToApp("ping"); state.pings[id] = performance.now(); });
    $("stateBtn").addEventListener("click", function () { sendToApp("getState"); });
    $("appEndBtn").addEventListener("click", function () { sendToApp("endSession"); });

    setAppReady(false);
    if (params.get("autostart") === "1") start();
})();
