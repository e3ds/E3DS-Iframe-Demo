/**
 * demo-ui-panel.js — the floating control panel.
 *
 * ── What this is ───────────────────────────────────────────────────────────
 *
 * The same panel the SDK demo has, driven the way an iframe integration has to
 * drive it. Every button here does what its twin does in the SDK demo; the only
 * difference is how the instruction travels.
 *
 *     SDK      e3ds_controller.captureScreenshot()      a direct function call
 *     iframe   postMessage({cmd:"captureScreenShot"})   a message across the frame
 *
 * That difference is the whole reason both demos exist, so the panel is
 * deliberately identical and the wiring is deliberately not.
 *
 * ── Where the messages actually go ─────────────────────────────────────────
 *
 * Nothing here calls postMessage itself. Every button routes through the
 * helpers already in iframe-commands.js, which is the one file that talks to
 * the frame. If you are copying this into your own page, that file is what you
 * need; this one is only the buttons.
 *
 * ── Deleting this ──────────────────────────────────────────────────────────
 *
 * This is a demo control panel, not part of the platform. Your own page will
 * have its own interface. Remove this file and its stylesheet and nothing else
 * stops working.
 */

/* Built once, then reused. Kept module-level rather than looked up each time so
 * that a rebuild cannot accidentally create a second panel. */
let e3dsDemoPanel = null;


/**
 * The panel itself, created on first use.
 *
 * ON <body>, not inside the stream's container. Anything that happens to the
 * page's own layout - the sidebar opening, the stream area resizing - must not
 * move or hide these controls.
 */
function e3dsGetDemoPanel() {
    if (e3dsDemoPanel) return e3dsDemoPanel;

    e3dsDemoPanel = document.getElementById("demoButtonPanel");
    if (e3dsDemoPanel) return e3dsDemoPanel;

    e3dsDemoPanel = document.createElement("div");
    e3dsDemoPanel.id = "demoButtonPanel";
    document.body.appendChild(e3dsDemoPanel);
    e3dsMakePanelDraggable(e3dsDemoPanel);

    return e3dsDemoPanel;
}


/* [E3DS-DEMO-CATEGORY] A button says which category it belongs to, and the
 * category appears if it does not already exist.
 *
 * WHY A PARAMETER RATHER THAN CALLING addDemoGroup FIRST. Grouping by call ORDER
 * means a button added later - when a stream connects, when an app is
 * identified, when a permission is granted - lands wherever the cursor happens
 * to be, which is under whichever heading was written last. Naming the category
 * on the button makes placement independent of when it is added, which is the
 * only way progressive controls can stay organised.
 *
 * Identical signature in the iframe demo and the SDK demo on purpose. Moving a
 * page between the two should be a change of transport, not a rewrite of the
 * interface code.
 */
const e3dsCategories = new Map();

function e3dsCategorySection(category) {
    if (!category) return e3dsGetDemoPanel();          // uncategorised: straight on the panel
    if (e3dsCategories.has(category)) return e3dsCategories.get(category);

    const panel = e3dsGetDemoPanel();

    const heading = document.createElement("div");
    heading.className = "demo-group-label";
    heading.textContent = category;

    const section = document.createElement("div");
    section.className = "demo-category";

    /* The heading is remembered ON the section so that removing a category
     * takes its title with it. Walking back to previousElementSibling would
     * work today and break the moment anything else is inserted between them. */
    section.e3dsHeading = heading;

    panel.appendChild(heading);
    panel.appendChild(section);
    e3dsCategories.set(category, section);
    return section;
}


/* [E3DS-DEMO-STAGES] WHEN a control appears, not just where.
 *
 * THE PROBLEM. Every control was built at page load, so the panel opened with
 * a full set of buttons over a black frame: Quality, resolutions, volume,
 * Restart, Terminate - all of them acting on a stream that did not exist yet.
 * Pressing one did nothing and reported nothing, which reads as a broken
 * product rather than a stream that has not started. Reported as exactly that:
 * "until video start, there is no need of quality HD, resolution button, volume
 * button".
 *
 * THE RULE. A control appears once the thing it needs is actually there, and
 * goes away again when that thing does. Three stages:
 *
 *   always   - acts on this page, not on a session. The frame permissions, and
 *              Restart: the one control whose whole purpose is to be pressed
 *              when there is nothing running.
 *   channel  - the data channel to Unreal is open. Anything that SENDS a
 *              message: console commands, app commands, device info.
 *   video    - frames are arriving. Picture, sound, input and session control.
 *              Setting the quality of a picture nobody is rendering does
 *              nothing, and neither does terminating a session that has not
 *              begun.
 *
 * WHY IT MIRRORS THE SDK DEMO. Same idea, same words, same fourth parameter as
 * sdk/scripts/demo-ui-controls.js. The SDK panel had to do this because its
 * buttons call into a player object that does not exist before the channel
 * opens; this one had the softer version of the same problem - the message is
 * accepted and discarded - which is why it went unnoticed longer. An integrator
 * moving between the two demos should not have to learn a second model.
 *
 * The stages are re-entered on every reconnect, so each builder starts by
 * clearing what it is about to rebuild. That is the only sane contract for
 * something wired to a connection event.
 */
const E3DS_STAGE_ALWAYS  = "always";
const E3DS_STAGE_CHANNEL = "channel";
const E3DS_STAGE_VIDEO   = "video";

/**
 * Add a button.
 *
 * @param {string}   label     what the button says
 * @param {function} onClick   what it does
 * @param {string}   [category] the group it belongs under; created if new
 * @param {string}   [needs]   always | channel | video - defaults to channel
 */
function addDemoButton(label, onClick, category, needs) {
    const section = e3dsCategorySection(category);

    const button = document.createElement("button");
    button.className = "demo-button";
    button.textContent = label;
    button.dataset.needs = needs || E3DS_STAGE_CHANNEL;
    button.addEventListener("click", onClick);

    section.appendChild(button);
    return button;
}


/**
 * Take away every control that needed something which has just gone.
 *
 * Empty categories go too, headings included. A heading with nothing under it
 * is a promise the panel is not keeping.
 *
 * @param {...string} stages which stages to remove, e.g. "channel", "video"
 */
function e3dsRemoveControlsNeeding(...stages) {
    const panel = document.getElementById("demoButtonPanel");
    if (!panel) return;

    stages.forEach((stage) => {
        panel.querySelectorAll('[data-needs="' + stage + '"]')
            .forEach((el) => el.remove());
    });

    /* Prune the categories that are now empty. Iterating over a copy: this
     * deletes from the same Map it is walking. */
    Array.from(e3dsCategories.entries()).forEach(([name, section]) => {
        if (section.children.length > 0) return;
        if (section.e3dsHeading) section.e3dsHeading.remove();
        section.remove();
        e3dsCategories.delete(name);
    });
}


/**
 * Add a group heading.
 *
 * Not a control - the iframe bridge exposes more commands than the SDK panel
 * shows, and twelve identical buttons in a column are hard to scan.
 */
function addDemoGroup(label) {
    const panel = e3dsGetDemoPanel();

    const heading = document.createElement("div");
    heading.className = "demo-group-label";
    heading.textContent = label;

    panel.appendChild(heading);
    return heading;
}


/**
 * Add a slider.
 *
 * @param {string}   label    the text beside it
 * @param {object}   opts     {min, max, step, value}
 * @param {function} onInput  called with the new value as the handle moves
 */
function addDemoSlider(label, opts, onInput, category, needs) {
    const panel = e3dsCategorySection(category);

    const row = document.createElement("div");
    row.dataset.needs = needs || E3DS_STAGE_CHANNEL;
    row.className = "demo-button demo-slider-row";
    row.style.cssText = "display:flex;align-items:center;gap:.5rem;cursor:default;";

    /* The drag handler starts a drag on pointerdown anywhere in the handle.
     * Without this, grabbing the slider could drag the whole panel and the
     * value would never move. */
    row.addEventListener("mousedown", (e) => e.stopPropagation());

    const text = document.createElement("span");
    text.textContent = label;
    text.style.cssText = "white-space:nowrap;";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = opts.min;
    slider.max = opts.max;
    slider.step = opts.step;
    slider.value = opts.value;
    slider.style.cssText = "flex:1;min-width:6rem;cursor:pointer;";

    const readout = document.createElement("span");
    readout.style.cssText =
        "min-width:2.5rem;text-align:right;font-variant-numeric:tabular-nums;";
    const show = (v) => { readout.textContent = Math.round(v * 100) + "%"; };
    show(Number(opts.value));

    /* "input", not "change": change fires only when the drag ends, so the sound
     * would jump at the end instead of following the handle. */
    slider.addEventListener("input", () => {
        const v = Number(slider.value);
        show(v);
        onInput(v);
    });

    row.appendChild(text);
    row.appendChild(slider);
    row.appendChild(readout);
    panel.appendChild(row);
    return row;
}


/* ── Dragging ───────────────────────────────────────────────────────────────
 *
 * Ported from the SDK demo unchanged. A panel pinned to one corner covers part
 * of the stream, and the part it covers is sometimes the part you want to see.
 */

function e3dsAddDragHandle(panel) {
    if (panel.querySelector(".demo-drag-handle")) return null;

    const handle = document.createElement("div");
    handle.id = panel.id + "DragHandle";
    handle.className = "demo-drag-handle";
    handle.title = "Drag to move this panel";
    handle.innerHTML = "<span></span><span></span><span></span>";
    panel.prepend(handle);
    return handle;
}

function e3dsMakePanelDraggable(panel) {
    const handle = e3dsAddDragHandle(panel);
    if (!handle) return;

    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

    handle.addEventListener("pointerdown", (e) => {
        const r = panel.getBoundingClientRect();

        /* Switch from the CSS right/top anchoring to explicit left/top the
         * moment a drag starts. Setting left while `right` is still applied
         * would stretch the panel between the two edges rather than move it. */
        panel.style.left = r.left + "px";
        panel.style.top = r.top + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";

        startX = e.clientX; startY = e.clientY;
        startLeft = r.left;  startTop = r.top;
        dragging = true;

        handle.classList.add("dragging");
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    handle.addEventListener("pointermove", (e) => {
        if (!dragging) return;

        const r = panel.getBoundingClientRect();

        /* Keep it on screen. Dragged fully off, it becomes unreachable with no
         * way back short of a reload. A 40px margin means some of it is always
         * grabbable. */
        const margin = 40;
        let left = startLeft + (e.clientX - startX);
        let top = startTop + (e.clientY - startY);

        left = Math.max(margin - r.width, Math.min(left, window.innerWidth - margin));
        top = Math.max(0, Math.min(top, window.innerHeight - margin));

        panel.style.left = left + "px";
        panel.style.top = top + "px";
    });

    const end = (e) => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove("dragging");
        try { handle.releasePointerCapture(e.pointerId); } catch (err) { }
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);

    /* If the window shrinks below where the panel was left, pull it back into
     * view rather than leaving it stranded off the edge. */
    window.addEventListener("resize", () => {
        if (panel.style.left === "") return;
        const r = panel.getBoundingClientRect();
        const margin = 40;
        panel.style.left = Math.max(margin - r.width,
            Math.min(r.left, window.innerWidth - margin)) + "px";
        panel.style.top = Math.max(0,
            Math.min(r.top, window.innerHeight - margin)) + "px";
    });
}


/* [E3DS-DEMO-TEXT-INPUT] A typed value, not a click.
 *
 * WHY NOT prompt(). The sidebar's "Console command..." item opens a
 * window.prompt(), and a prompt is the wrong shape for this job: it is modal,
 * so the stream is unreachable while it is open; it forgets what you typed the
 * moment you dismiss it, so trying "stat unit" after "stat fps" means typing
 * the whole thing again; and several browsers now suppress prompts in an iframe
 * context entirely. A field that stays on the panel keeps the last command
 * visible and lets Enter fire it again.
 */
function addDemoTextInput(label, opts, onSubmit, category, needs) {
    const section = e3dsCategorySection(category);
    const options = opts || {};

    const row = document.createElement("div");
    row.className = "demo-text-row" + (options.multiline ? " demo-text-multiline" : "");
    row.dataset.needs = needs || E3DS_STAGE_CHANNEL;

    /* multiline: a box that shows a whole JSON object (scrolls if longer); Ctrl+Enter sends, Enter is a new line. */
    const field = document.createElement(options.multiline ? "textarea" : "input");
    if (options.multiline) field.rows = 3; else field.type = "text";
    field.className = "demo-text-input";
    field.placeholder = options.placeholder || "";
    /* The tooltip carries the examples the placeholder must not, so it takes an
     * override rather than always being the label. */
    field.title = options.title || label;
    field.value = options.value || "";
    /* A click in the field must not be read as a grab on the panel. */
    field.addEventListener("mousedown", (e) => e.stopPropagation());
    /* Typing into the field must not reach the page's own key handling. */
    field.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter" && (!options.multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
    });

    const go = document.createElement("button");
    go.className = "demo-text-send";
    go.textContent = options.buttonLabel || "Send";
    go.addEventListener("mousedown", (e) => e.stopPropagation());
    go.addEventListener("click", () => send());

    function send() {
        const value = field.value.trim();
        if (!value) return;
        onSubmit(value);
        /* Say it went: the button reads "Sent" for a moment, so a press is never silent. */
        const label = options.buttonLabel || "Send";
        go.textContent = "Sent ✓";
        clearTimeout(go.e3dsSentTimer);
        go.e3dsSentTimer = setTimeout(() => { go.textContent = label; }, 900);
        /* The text stays. Running a command and then a variation of it is the
         * normal way this gets used, and clearing the field would make every
         * variation a full retype. */
        field.select();
    }

    /* The button is usable exactly when there is something to send: greyed out while the box is empty, active the
     * moment it holds text - typed, pasted, or written in by an app control (which calls field.e3dsRefresh()). */
    const refresh = () => { go.disabled = !field.value.trim() || field.dataset.locked === "1"; };
    field.addEventListener("input", refresh);
    field.e3dsRefresh = refresh;
    refresh();

    row.appendChild(field);
    row.appendChild(go);
    section.appendChild(row);
    return field;
}


/* [E3DS-DEMO-SELECT] One of a list, chosen.
 *
 * A dropdown rather than a button per option, because the options are not
 * always known when the panel is built - a list the platform reports can have
 * one entry or six. A row of buttons cannot be that.
 */
function addDemoSelect(label, opts, onChange, category, needs) {
    const section = e3dsCategorySection(category);
    const options = opts || {};

    const row = document.createElement("div");
    row.className = "demo-select-row";
    row.dataset.needs = needs || E3DS_STAGE_CHANNEL;

    const caption = document.createElement("div");
    caption.className = "demo-select-label";
    caption.textContent = label;

    const select = document.createElement("select");
    select.className = "demo-select";
    select.title = label;
    /* A click in the dropdown is a click on a control, not a grab on the panel,
     * and it must not be handed back to the stream either - the page returns
     * focus to the frame on any click, which would close the list as it opens. */
    select.addEventListener("mousedown", (e) => e.stopPropagation());
    select.addEventListener("click", (e) => e.stopPropagation());
    select.addEventListener("change", () => onChange(select.value, select));

    /* A placeholder with an EMPTY VALUE. Giving it a label as its value is the
     * classic version of this bug: the first thing sent is then the word
     * "Loading", which is not an id of anything. */
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = options.placeholder || "\u2014 nothing listed yet \u2014";
    select.appendChild(placeholder);

    row.appendChild(caption);
    row.appendChild(select);
    section.appendChild(row);
    return select;
}

/* [E3DS-EMULATE-KEY] What the Key dropdown offers.
 *
 * Movement first, then the keys an app is most likely to bind, then the
 * modifiers - not alphabetical, because nobody scans this looking for the
 * letter J. A demo list, not the limit: the command takes any single letter or
 * digit, plus the named keys in E3DS_NAMED_KEYS in the player.
 */
const E3DS_DEMO_KEYS = [
    "W", "A", "S", "D",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "Space", "Enter", "Escape", "Tab",
    "E", "F", "Q", "R", "M",
    "1", "2", "3", "4", "5",
    "Shift", "Control", "Alt"
];

/* ── The controls ───────────────────────────────────────────────────────────
 *
 * Each group below names the SDK call it mirrors, so the two demos can be read
 * side by side.
 */

function buildDemoPanel() {

    /* [E3DS-DEMO-STAGES] STAGE "always" - what this page can do on its own: where the stream comes from (the URL
     * box acts on the iframe ELEMENT, which exists from the moment the page does).
     *
     * Everything else waits, Restart included - it appears when the stream connects, as in the SDK demo. See
     * e3dsBuildChannelControls and e3dsBuildVideoControls below. */

    e3dsBuildConnectionPanel();

    /* Built here, not on the first message: see the note in
     * e3dsGetResponsePanel(). A panel that appears only once an app happens to
     * say something is indistinguishable from a broken one. */
    e3dsGetResponsePanel();

    /* [E3DS-WHO-IS-WHO] State the two sites before anything can confuse them.
     *
     * Said at the top of the log rather than beside the first failure, because
     * by the time a line reads "permission denied" the reader is already trying
     * to reconcile it with a padlock that says otherwise. Establishing which
     * site is which first turns that from a contradiction into a fact.
     *
     * Only when a permission is actually in play. On a stream that asks for
     * no camera this is four lines about nothing. */
    e3dsExplainTheTwoSites();

    /* [E3DS-APP-GATING] Decide from the URL now; the player corrects it later. */
    e3dsApplyAppGating(e3dsAppFromUrl(e3dsCurrentStreamUrl()).appName, "the stream URL");
}


/**
 * STAGE "channel" - the data channel to Unreal is open.
 *
 * [E3DS-DEMO-STAGES] Everything here SENDS A MESSAGE and needs nothing else:
 * console commands, app commands, and the device report. None of them care
 * whether a single frame has been decoded yet.
 *
 * Safe to call again on every reconnect - it clears what it is about to
 * rebuild, and the video stage with it, because a channel that has just opened
 * means the video has not arrived yet either.
 */
function e3dsBuildChannelControls() {
    e3dsChannelStageBuilt = true;
    e3dsRemoveControlsNeeding(E3DS_STAGE_CHANNEL, E3DS_STAGE_VIDEO);

    /* ── The session ────────────────────────────────────────
     * Restart reloads the frame, which is what an iframe integration has instead of handing a fresh token to a
     * running player. Shown from the first connection on (owner 2026-10-10: not before the stream has started) and
     * then kept - "always" - so it is still there after the stream ends. Its group goes to the top of the panel,
     * where it sits in the SDK demo. */
    if (!document.getElementById("e3dsRestartBtn")) {
        const restart = addDemoButton("Restart stream", () => reloadStream(), "Session", E3DS_STAGE_ALWAYS);
        restart.id = "e3dsRestartBtn";
        const session = e3dsCategories.get("Session");
        const panel = e3dsGetDemoPanel();
        const handle = panel.querySelector(".demo-drag-handle");
        panel.insertBefore(session.e3dsHeading, handle ? handle.nextSibling : panel.firstChild);
        session.e3dsHeading.after(session);
    }

    /* The app-specific buttons were swept away with the rest, so the gating has
     * to run again - and it will do nothing unless it is told to forget what it
     * decided last time. */
    e3dsGatedForApp = null;
    e3dsApplyAppGating(e3dsAppFromUrl(e3dsCurrentStreamUrl()).appName, "the stream URL");

    console.log("[E3DS demo] Data channel open - adding the controls that send " +
        "messages to the app (console commands, device info).");

    /* ── Diagnostics ────────────────────────────────────────────────────────
     * SDK: e3ds_controller.sendConsoleCommandToUE("stat fps")
     *
     * Console commands are refused unless the app's configuration allows them.
     * If these do nothing and nothing is reported, that setting is why - the
     * command is dropped, not failed. */

    addDemoButton("Show FPS", () => toggleUnrealFpsCounter(), "Diagnostics");

    addDemoButton("Show streaming graphs", () => {
        sendUnrealConsoleCommand("stat pixelstreaminggraphs");
        sendUnrealConsoleCommand("stat pixelstreaming2graphs");
    }, "Diagnostics");

    /* Any console command, typed. The two buttons above are shortcuts for the
     * two most useful ones; this is the whole console, and it sits directly
     * under them because that is where someone goes after the shortcuts have
     * told them something interesting.
     *
     * THE PLACEHOLDER NAMES THE JOB, NOT ONE COMMAND. It read "stat unit",
     * which is a fine example and a bad placeholder: a single command sitting
     * in the box reads as the thing the box is FOR, and someone who does not
     * already know the console would conclude this field takes that one value.
     * "type a console command" says what to do with it, which is what a
     * placeholder is for - the examples belong in the tooltip, where they
     * inform without narrowing. */
    addDemoTextInput("Unreal console command",
        {
            placeholder: "type a console command",
            buttonLabel: "Send",
            title: "Any Unreal console command, for example: stat fps, stat unit, "
                + "r.ScreenPercentage 50"
        },
        (command) => sendUnrealConsoleCommand(command),
        "Diagnostics");

    /* [E3DS-DEVICE-INFO] The documented sendDeviceInfo command, which a page can
     * now send as well as an app. The reply is takeUserDeviceInfo - the same
     * message, in the same shape, that an app has always received. */
    /* The answer is shown on screen as well as in the log - on a phone the log is usually closed. */
    addDemoButton("Device info", () => { e3dsShowNextDeviceInfo = true; demoGetDeviceInfo(); }, "Diagnostics");

    /* [E3DS-DEMO-PARITY] The same field the SDK demo has. It keeps what you typed,
     * so sending a variation is an edit rather than a retype.
     *
     * JSON if it parses, a plain string if it does not - both are legitimate
     * things to send an app, and guessing wrong is worse than either. */
    e3dsAppMessageBox = addDemoTextInput("Message to your app",
        {
            placeholder: '{ "Character": "Aurora" }',
            buttonLabel: "Send to app",
            multiline: true,
            title: "JSON if it parses, otherwise sent as a plain string. Ctrl+Enter sends."
        },
        (value) => {
            let payload = value;
            try { payload = JSON.parse(value); }
            catch (e) { console.log("[E3DS demo] message box: not JSON (" + e.message + ") - sent as a plain string"); }
            sendToUnrealApp(payload);
        },
        "Your app");

    /* The player volunteers appInfo when the stream is ready; asking as well
     * covers a channel that opened after that moment. The reply adds the
     * app-specific buttons - see e3dsOnAppInfo. */
    sendCommandToStream("getAppInfo", "");
}


/**
 * STAGE "video" - frames are arriving.
 *
 * [E3DS-DEMO-STAGES] Picture, sound, input and ending the session. Every one of
 * these acts on something that has to exist first: there is no picture to set
 * the quality of, no audio track to set the volume on, no video element to lock
 * the pointer to, and nothing to terminate.
 */
let e3dsChannelStageBuilt = false;

function e3dsBuildVideoControls() {
    e3dsSetConnectionLocked(false, "the video is playing");
    /* [E3DS-DEMO-STAGES] IF THE CHANNEL STAGE HAS NOT RUN, SAY SO - do not
     * quietly build it here.
     *
     * Frames cannot arrive without the data channel, so reaching this point
     * without the channel stage means its event was missed, and the fault is in
     * the notice, not in the panel. Building it here anyway would hide exactly
     * the bug worth seeing - the platform now announces the channel from the
     * channel itself ([E3DS-DATACHANNEL-NOTICE] in the player), and this line
     * is how we would learn that stopped working. */
    if (!e3dsChannelStageBuilt) {
        window.e3dsLogAppResponse(
            "video is playing but stream.channelOpen never arrived - the "
            + "Diagnostics and Your app controls are missing because of that, "
            + "not because they were removed",
            "err", "stage");
    }

    e3dsRemoveControlsNeeding(E3DS_STAGE_VIDEO);

    console.log("[E3DS demo] Video is playing - adding picture, sound, input " +
        "and Terminate. These were held back because they do nothing before " +
        "there is a stream.");

    /* ── Picture ────────────────────────────────────────────────────────────
     * SDK: setVideoDetailLevel(level) / setResolution(w, h)
     *
     * Quality is offered as the named levels only. A level is the portable unit: the platform turns it into
     * whatever number the running plugin needs, and that number can change from release to release - the names
     * do not. So the page never sends a raw number.
     *
     * "Match window resolution" is the other half of the two fixed sizes: freezing a size turns viewport
     * matching off, and this turns it back on without reloading the stream. */
    addDemoButton("Quality: Low", () => demoQualityPreset("low"), "Picture", E3DS_STAGE_VIDEO);
    addDemoButton("Quality: Medium", () => demoQualityPreset("medium"), "Picture", E3DS_STAGE_VIDEO);
    addDemoButton("Quality: High", () => demoQualityPreset("high"), "Picture", E3DS_STAGE_VIDEO);
    addDemoButton("Quality: Ultra", () => demoQualityPreset("ultra"), "Picture", E3DS_STAGE_VIDEO);
    addDemoButton("1920 x 1080", () => freezeStreamResolution(1920, 1080), "Picture", E3DS_STAGE_VIDEO);
    addDemoButton("800 x 600", () => freezeStreamResolution(800, 600), "Picture", E3DS_STAGE_VIDEO);

    /* Anything else, typed. The two presets above cover the common cases; this
     * covers the one you actually need to test, and it sits with them rather
     * than behind a dialog in the sidebar.
     *
     * "1280x720" and "1280 x 720" and "1280, 720" all work: the separator is
     * whatever is between the two numbers. Being strict about it here would
     * only ever produce an error message about punctuation. */
    addDemoTextInput("Custom resolution",
        { placeholder: "1280 x 720", buttonLabel: "Set" },
        (value) => {
            const numbers = value.match(/\d+/g);
            if (!numbers || numbers.length < 2) {
                window.e3dsLogAppResponse(
                    "A resolution needs two numbers, e.g. 1280 x 720. Got: " + value,
                    "err", "custom resolution");
                return;
            }
            freezeStreamResolution(Number(numbers[0]), Number(numbers[1]));
        },
        "Picture", E3DS_STAGE_VIDEO);

    addDemoButton("Match window resolution", () => demoUseViewportResolution(),
        "Picture", E3DS_STAGE_VIDEO);

    /* ── Sound ──────────────────────────────────────────────────────────────
     * SDK: e3ds_controller.setVolume(v)
     *
     * Starts at 1. Raising it from silent may be refused until the viewer has
     * clicked something - browsers block audio that begins without a gesture,
     * and that refusal is invisible from here. */

    addDemoSlider("Volume", { min: 0, max: 1, step: 0.01, value: 1 },
        (v) => sendCommandToStream("setVolume", v), "Sound", E3DS_STAGE_VIDEO);

    /* ── Input ──────────────────────────────────────────────────────────────
     * SDK: switchMouseControlSchemeTo(scheme) / setTouchInputEnabled(on) */

    /* "HoveringMouse" / "LockedMouse" - the names switchMouseControlSchemeTo
     * actually tests for. It was being sent "Hovering" and "Locked", which match
     * neither branch, so the function ran and did nothing. No error: the command
     * was accepted, the value simply was not one of the two it recognises. */
    addDemoButton("Mouse: Hovering", () => demoMouseScheme("HoveringMouse"), "Input", E3DS_STAGE_VIDEO);
    addDemoButton("Mouse: Locked", () => demoMouseScheme("LockedMouse"), "Input", E3DS_STAGE_VIDEO);

    /* [E3DS-EMULATE-KEY] A key chosen, then sent - rather than three fixed
     * buttons for M, W-down and W-up. Which key matters is entirely
     * the app's business, so the useful control is one that can send any of
     * them.
     *
     * Press and Hold are separate because they are different things. Press is a
     * down and an up together, which is what a menu or an action key wants;
     * Hold leaves the key down until Release, which is what movement wants. One
     * button cannot be both, and holding W with a button that also releases it
     * is exactly what people try first. */
    /* Nothing chosen at first: the list opens on "Select a key", and the three buttons stay visible but disabled
     * until a key is picked - so nobody presses Release key without knowing which key it would release. */
    const keyButtons = [];
    const keySelect = addDemoSelect("Key", { placeholder: "Select a key" },
        (value) => keyButtons.forEach((b) => { b.disabled = !value; }),
        "Input", E3DS_STAGE_VIDEO);
    E3DS_DEMO_KEYS.forEach((k) => {
        const option = document.createElement("option");
        option.value = k;
        option.textContent = k;
        keySelect.appendChild(option);
    });

    keyButtons.push(addDemoButton("Press key", () => demoPressKey(keySelect.value), "Input", E3DS_STAGE_VIDEO));
    keyButtons.push(addDemoButton("Hold key down", () => demoHoldKey(keySelect.value), "Input", E3DS_STAGE_VIDEO));
    keyButtons.push(addDemoButton("Release key", () => demoReleaseKey(keySelect.value), "Input", E3DS_STAGE_VIDEO));
    keyButtons.forEach((b) => { b.disabled = true; });

    /* [E3DS-DEMO-PARITY] Touch input off is what you want when your own buttons
     * sit over the stream on a phone: a tap on your control should not also
     * reach the app underneath it. */
    let e3dsTouchOn = true;
    const e3dsTouchButton = addDemoButton("Touch input: on", () => {
        e3dsTouchOn = !e3dsTouchOn;
        demoTouchInput(e3dsTouchOn);
        e3dsTouchButton.textContent = "Touch input: " + (e3dsTouchOn ? "on" : "off");
    }, "Input", E3DS_STAGE_VIDEO);

    /* The play button the player shows when the app is ready. A page with its
     * own start screen presses it from there rather than asking the viewer to
     * click twice. */
    addDemoButton("Press play", () => demoPressPlay(), "Input", E3DS_STAGE_VIDEO);

    /* NO TOUCH INPUT BUTTONS. setTouchInputEnabled is a real bridge command and
     * demoTouchInput() in iframe-commands.js still shows how to call it - but a
     * pair of buttons for it earns no place on the panel. Touch forwarding is a
     * decision an integrator makes once, in code, for the kind of device they
     * are building for. It is not something a viewer toggles, and on a desktop
     * with no touchscreen neither setting changes anything at all, so both
     * buttons read as broken to the very person most likely to press them. */

    /* ── The window ─────────────────────────────────────────────────────────
     * SDK: toggleFullscreen() / captureScreenshot()
     *
     * Fullscreen must come from a real click - a browser refuses a request that
     * did not originate in a gesture. A button satisfies that; a timer does not.
     *
     * The screenshot is saved by the browser inside the frame. On iOS and in
     * in-app browsers that save silently does not happen, and there is no error
     * to catch - see the SDK guide on learn.eagle3dstreaming.com. */

    /* [E3DS-IFRAME-FULLSCREEN] The PARENT does this, not the frame.
     *
     * This was posting {cmd:"toggleFullscreen"} at the player, and the
     * documentation says plainly not to: "Use the browser's own Fullscreen API
     * on your page, not a message to the frame - requestFullscreen() on the
     * element you want enlarged."
     *
     * And it is the better answer. The parent decides WHAT gets enlarged - here
     * the iframe, but it could be a wrapper carrying your own controls, which a
     * message to the frame could never do. It also works without any cooperation
     * from the player.
     *
     * The iframe still needs fullscreen permission, or the request is refused. */
    addDemoButton("Fullscreen", () => {
        const frame = getStreamFrame();
        if (!frame) return;
        try {
            if (document.fullscreenElement) { document.exitFullscreen(); return; }
            const req = frame.requestFullscreen || frame.webkitRequestFullscreen
                     || frame.mozRequestFullScreen || frame.msRequestFullscreen;
            if (req) req.call(frame);
            else console.warn("[E3DS demo] this browser offers no fullscreen for an element");
        } catch (e) {
            console.warn("[E3DS demo] fullscreen refused:", e);
        }
    }, "Window", E3DS_STAGE_VIDEO);
    addDemoButton("Screenshot", () => sendCommandToStream("captureScreenShot"), "Window", E3DS_STAGE_VIDEO);

    /* ── The session ───────────────────────────────────────
     * SDK: e3ds_controller.terminate()
     *
     * Terminate ends the session and releases the machine. Worth pressing when
     * you have finished testing rather than leaving the tab open: an unwatched
     * session still occupies a machine.
     *
     * Restart is NOT here - it is in the always stage, because reloading the
     * frame is exactly what you want when there is no stream to reload into. */

    addDemoButton("Terminate stream", () => demoTerminateSession(),
        "Session", E3DS_STAGE_VIDEO);
}


/* [E3DS-WHO-IS-WHO] The two sites and their two permissions, said once. */
function e3dsExplainTheTwoSites() {
    const frame = getStreamFrame();
    const allow = (frame && frame.getAttribute("allow")) || "";
    if (allow.indexOf("camera") === -1) return;

    window.e3dsLogAppResponse(
        "\u2022 " + e3dsThisSite() + " \u2014 this page. Its padlock is the one you can see.\n"
        + "\u2022 " + e3dsStreamSite() + " \u2014 the stream, inside the iframe. A different "
        + "site, with its own permission, which the address bar never shows.\n"
        + "Every line below that mentions a permission names which of the two it "
        + "is about.",
        "note", "TWO SITES, TWO PERMISSIONS");
}

/* [E3DS-DEMO-CONNECTION] Where the stream comes from. Load reloads the frame with the new URL.
 *
 * The frame is allowed fullscreen only - the same `allow` as the iframe in index.html, so Load does not change what
 * the stream may use. The camera is not offered: this demo's app does not use one.
 *
 * The microphone is deliberately not here, and not anywhere in this demo. It needs more than an attribute - the
 * permission has to be asked for by THIS page, inside a click, before the frame ever loads. It has its own demo.
 */
const E3DS_PERMISSIONS = [
    { key: "fullscreen", on: true },
];

/* [E3DS-CONNECTION-LOCK] While a stream is loading, the App dropdown, the URL box and Load URL are disabled - picking
 * another app mid-load would start a second launch and keep machines busy for nothing. They come back when the video
 * plays or the session ends, and after E3DS_CONNECTION_LOCK_MAX_MS whatever happened, so a stream that never starts
 * cannot leave them locked. */
let e3dsConnectionControls = [];
let e3dsConnectionLockTimer = null;
const E3DS_CONNECTION_LOCK_MAX_MS = 180000;
function e3dsSetConnectionLocked(locked, why) {
    e3dsConnectionControls.forEach((el) => {
        el.disabled = locked;
        el.title = locked ? "Available once the stream has started" : (el.dataset.title || "");
        if (typeof el.e3dsRefresh === "function") { el.dataset.locked = locked ? "1" : ""; el.e3dsRefresh(); }
    });
    clearTimeout(e3dsConnectionLockTimer);
    if (locked) {
        e3dsConnectionLockTimer = setTimeout(() => {
            e3dsSetConnectionLocked(false, "no video after " + (E3DS_CONNECTION_LOCK_MAX_MS / 1000) + "s");
        }, E3DS_CONNECTION_LOCK_MAX_MS);
    }
    console.log("[E3DS demo] Connection controls " + (locked ? "locked" : "unlocked") + ": " + why);
}

function e3dsBuildConnectionPanel() {

    /* ── Where the stream comes from ─────────────────────────────
     *
     * Two controls, one decision. "Select an app" lists the demo streams (DEMO_CONFIG.streams in iframe-config.js):
     * picking one puts its URL in the box below and loads it. The box is always there and always shows the URL in
     * use, so anyone can paste their OWN app's URL and press "Load URL". The URL is remembered, so the reload it
     * needs does not lose it. */
    let urlField = null;
    const appSelect = addDemoSelect("App", { placeholder: "Select an app" }, (value) => {
        if (!value) return;
        if (urlField) { urlField.value = value; urlField.e3dsRefresh(); }
        e3dsApplyConnection(value);
    }, "Connection", E3DS_STAGE_ALWAYS);
    (DEMO_CONFIG.streams || []).forEach((st) => {
        const option = document.createElement("option");
        option.value = st.url;
        option.textContent = st.label;
        appSelect.appendChild(option);
    });
    /* Show what is loaded (the Pixel Streaming sample by default); "Select an app" when it is not in the list. */
    if (Array.from(appSelect.options).some((o) => o.value === e3dsCurrentStreamUrl())) {
        appSelect.value = e3dsCurrentStreamUrl();
    }

    urlField = addDemoTextInput("Stream URL",
        {
            placeholder: "https://connector.eagle3dstreaming.com/v5/owner/AppName/default",
            buttonLabel: "Load URL",
            multiline: true,
            value: e3dsCurrentStreamUrl(),
            title: "Any stream URL - paste your own app's and press Load URL"
        },
        (url) => {
            /* A typed URL that is one of the listed apps shows that app in the dropdown; anything else shows
             * "Select an app". */
            appSelect.value = Array.from(appSelect.options).some((o) => o.value === url) ? url : "";
            e3dsApplyConnection(url);
        },
        "Connection", E3DS_STAGE_ALWAYS);

    e3dsConnectionControls = [appSelect, urlField, urlField.parentNode.querySelector("button")];
    e3dsConnectionControls.forEach((el) => { el.dataset.title = el.title || ""; });
    e3dsSetConnectionLocked(true, "the first stream is loading");
}

/**
 * Load a URL into the frame (fullscreen allowed, as in index.html).
 *
 * @param {string} url where to point the frame; blank keeps the current URL
 */
function e3dsApplyConnection(url) {
    const frame = getStreamFrame();
    if (!frame) return;

    const target = url || e3dsCurrentStreamUrl();
    e3dsRememberStreamUrl(target);
    e3dsSetConnectionLocked(true, "loading " + target);

    /* allowfullscreen is the legacy spelling and still honoured; set on the new
     * element below, in step with the checkbox so the two cannot disagree. */
    const allow = E3DS_PERMISSIONS.filter((p) => p.on).map((p) => p.key).join("; ");

    /* The controls belong to the session that is about to end. */
    e3dsRemoveControlsNeeding(E3DS_STAGE_CHANNEL, E3DS_STAGE_VIDEO);

    /* [E3DS-FRAME-GESTURE] NAVIGATE INSIDE THE CLICK. No timer, ever.
     *
     * This used to set src to about:blank and then assign the real URL from a
     * setTimeout, so the browser would re-read `allow`. That detour threw away
     * the thing that mattered: a timeout DISCARDS transient user activation, so
     * the one path that started from a real click arrived at the navigation
     * with no click attached to it.
     *
     * It matters because a cross-origin frame asking the browser for anything
     * with no activation behind it is refused, silently. The navigation has to
     * happen inside the click, which is why the element is replaced rather than
     * having its src reassigned from a timer.
     *
     * Replacing the element rather than reassigning src is what lets this be
     * synchronous. A fresh iframe reads `allow` on its first navigation, so
     * there is nothing to force and nothing to wait for - one navigation, still
     * inside the click. */
    const fresh = document.createElement("iframe");

    /* Everything the old frame carried except its address and its stale
     * permissions - id and title especially, because getStreamFrame() finds it
     * by id and screen readers announce it by title. */
    Array.from(frame.attributes).forEach((a) => {
        if (a.name !== "src" && a.name !== "allow") fresh.setAttribute(a.name, a.value);
    });

    fresh.setAttribute("allow", allow);
    if (E3DS_PERMISSIONS.find((perm) => perm.key === "fullscreen" && perm.on)) {
        fresh.setAttribute("allowfullscreen", "");
    } else {
        fresh.removeAttribute("allowfullscreen");
    }

    frame.replaceWith(fresh);
    fresh.src = target;

    /* [E3DS-APP-GATING] The URL names the app, so the app-specific buttons can
     * be decided now rather than waiting for the stream to say so. */
    e3dsApplyAppGating(e3dsAppFromUrl(target).appName, "the stream URL");

    if (typeof window.e3dsLogAppResponse === "function") {
        window.e3dsLogAppResponse({ url: target, allow: allow || "(nothing)" },
            "note", "loading the frame");
    }
}


/* [E3DS-LOG] Everything that crosses the bridge, newest first.
 *
 * IT USED TO BE "RESPONSE FROM YOUR APP" and that was too narrow to be useful.
 * Only messages the Unreal app sent back landed here, so a command that was
 * never delivered, a platform event that never arrived, and an app that simply
 * had nothing to say all produced the same thing: an empty panel. The one
 * question anyone actually has - did my message go out, and did anything come
 * back - could not be answered from it.
 *
 * So it logs BOTH DIRECTIONS and every kind of traffic. A page that shows only
 * what it sent cannot answer "did that arrive", and a page that shows only what
 * came back cannot answer "did I ask correctly". The whole conversation is the
 * only view that answers both.
 *
 *   out   what this page sent into the frame
 *   in    what came back - platform events and app messages alike
 *   err   something failed, and the reason
 *   note  this page's own interpretation of what just happened
 *
 * The arrow and the colour carry the direction so it reads at a glance; the
 * kind is on the element too, so a filter can be added later without touching
 * the callers.
 *
 * This was a single <textarea> pinned inside the stream area, overwritten by
 * each new message - so only the most recent one existed and anything that
 * arrived while you were looking away was gone. Watching a conversation between
 * a page and an app is most of what this demo is for, and one line of it is not
 * a conversation.
 *
 * Now a floating panel like the controls: newest entry on top, older ones below,
 * scrollable, and draggable to wherever it is not in the way.
 */
let e3dsResponsePanel = null;
const E3DS_RESPONSE_MAX = 200;   // bounded: a chatty app must not grow the DOM forever

function e3dsGetResponsePanel() {
    if (e3dsResponsePanel) return e3dsResponsePanel;

    e3dsResponsePanel = document.createElement("div");
    e3dsResponsePanel.id = "appResponsePanel";

    /* Title and Clear share a row: the button belongs to this panel, and putting
     * it anywhere else would make the viewer hunt for it. */
    const head = document.createElement("div");
    head.className = "app-response-head";

    const title = document.createElement("div");
    title.className = "demo-group-label";
    title.textContent = "Log";

    /* [E3DS-APP-RESPONSE] Clear.
     *
     * A chatty app fills this in seconds, and once it is full the entry you
     * actually wanted is somewhere below a hundred others. Being able to empty
     * it and then do the one thing you are testing is the difference between
     * reading a log and searching one. */
    const clear = document.createElement("button");
    clear.className = "app-response-clear";
    clear.textContent = "Clear";
    clear.title = "Remove every entry";
    clear.addEventListener("mousedown", (e) => e.stopPropagation());   // not a panel drag
    clear.addEventListener("click", () => {
        const l = document.getElementById("appResponseList");
        if (!l) return;
        l.innerHTML = "";
        const note = document.createElement("div");
        note.className = "app-response-empty";
        note.textContent = "Cleared.";
        l.appendChild(note);
    });

    const list = document.createElement("div");
    list.id = "appResponseList";

    /* [E3DS-APP-RESPONSE] AN EMPTY PANEL IS NOT A MISSING PANEL.
     *
     * This panel used to be built the first time something was logged, so a
     * page whose app had not spoken yet had no panel at all - reported as "it
     * is sometimes showing up, sometimes it is not showing up. Where is it
     * gone". It was never gone; it had not been born. It is now built with the
     * rest of the controls and says so when it is empty. */
    const emptyNote = document.createElement("div");
    emptyNote.className = "app-response-empty";
    emptyNote.textContent = "Nothing yet. Everything this page sends into the stream, and everything that comes back, appears here newest first.";
    list.appendChild(emptyNote);

    head.appendChild(title);
    head.appendChild(clear);
    e3dsResponsePanel.appendChild(head);
    e3dsResponsePanel.appendChild(list);
    document.body.appendChild(e3dsResponsePanel);
    e3dsMakePanelDraggable(e3dsResponsePanel);

    return e3dsResponsePanel;
}

/* Called for every object the app sends. */
const E3DS_LOG_MARK = { out: "\u2192", in: "\u2190", err: "\u2717", note: "\u00b7" };

/**
 * Put one line in the log.
 *
 * @param {*}      obj    what to show - an object is pretty-printed
 * @param {string} [kind] out | in | err | note, default in
 * @param {string} [label] a few words of context beside the time
 */
function e3dsLogAppResponse(obj, kind, label) {
    try {
        e3dsGetResponsePanel();
        const list = document.getElementById("appResponseList");
        if (!list) return;

        /* The "nothing yet" line has served its purpose the moment there is
         * something. Leaving it would put it under the first real entry, still
         * claiming the log is empty. */
        const emptyNote = list.querySelector(".app-response-empty");
        if (emptyNote) emptyNote.remove();

        const entry = document.createElement("div");
        entry.className = "app-response-entry";
        entry.dataset.kind = kind || "in";

        const when = document.createElement("div");
        when.className = "app-response-time";
        when.textContent = E3DS_LOG_MARK[kind || "in"] + " " + new Date().toLocaleTimeString()
            + (label ? ("  " + label) : "");

        const body = document.createElement("pre");
        body.className = "app-response-body";
        body.textContent = (obj === undefined || obj === null) ? ""
            : ((typeof obj === "string") ? obj : JSON.stringify(obj, null, 2));

        entry.appendChild(when);
        if (body.textContent) entry.appendChild(body);

        /* Newest at the top: the thing you just did is what you are looking for,
         * and scrolling to the bottom to find it is the wrong way round. */
        list.prepend(entry);

        while (list.children.length > E3DS_RESPONSE_MAX) list.removeChild(list.lastChild);
    } catch (e) { /* a log must never break the demo */ }
}
window.e3dsLogAppResponse = e3dsLogAppResponse;


/* [E3DS-APP-GATING] The app-specific controls, and the two ways we learn which
 * app is on screen.
 *
 * { Character: "Aurora" } and { Skin: "1" } are messages the sample app listens
 * for. Send them to anything else and nothing happens - no error, no reply -
 * which a viewer reads as a broken button rather than a mismatched message. So
 * the buttons exist only for an app known to understand them.
 *
 * THE SAME LIST AND THE SAME BUTTONS AS THE SDK DEMO
 * (sdk/scripts/demo-ui-controls.js). Two demos disagreeing about which app can do
 * what would be worse than either being wrong on its own.
 *
 * AN ALLOWLIST, NOT A BLOCKLIST. Under a blocklist a new app inherits buttons
 * it cannot answer, and the failure is silent.
 *
 * TWO SOURCES, AND THEY ARE NOT EQUAL:
 *
 *   the stream URL - available immediately, including before anything
 *       connects, because /v5/<owner>/<appName>/<config> is right there. It is
 *       a good guess and no more: a shortened link, a redirect, or a
 *       configuration that starts a different app all produce a URL that
 *       disagrees with what is actually streaming.
 *   the player's appInfo - authoritative, because the player is looking at the
 *       app, but it does not arrive until the stream is ready.
 *
 * So the URL decides at once and appInfo corrects it when it comes. Whichever
 * speaks last wins, and the log says which one decided.
 */
/* [E3DS-APP-CONTROLS] Controls that only one app understands, per app name. An entry is either a button -
 * [label, message] - or a dropdown - { label, placeholder, options: [[label, message], ...] } - and the message is
 * what sendToUnrealApp() sends. Add an app here and its controls appear under "Your app" whenever it is streaming;
 * any app not listed gets a "No app controls available" line instead. */
/* The "Message to your app" box. Every app control writes the message it sends into it, so the viewer sees that a
 * button is just a JSON object sent to the app - and can edit it and send a variation. */
let e3dsAppMessageBox = null;

/* [E3DS-RESULT-BOX] An answer the viewer asked for, on screen: a title, the JSON, and Close. Used for Device info,
 * whose reply would otherwise only be in the log - which on a phone is usually closed. */
let e3dsShowNextDeviceInfo = false;
function e3dsShowResultBox(title, obj) {
    let box = document.getElementById("e3dsResultBox");
    if (!box) {
        box = document.createElement("div");
        box.id = "e3dsResultBox";
        box.setAttribute("role", "dialog");
        box.innerHTML = '<div class="e3ds-result-title"></div><pre class="e3ds-result-body"></pre>'
            + '<button type="button" class="demo-button e3ds-result-close">Close</button>';
        box.querySelector(".e3ds-result-close").addEventListener("click", () => { box.style.display = "none"; });
        box.addEventListener("mousedown", (e) => e.stopPropagation());
        box.addEventListener("click", (e) => e.stopPropagation());
        document.body.appendChild(box);
    }
    box.querySelector(".e3ds-result-title").textContent = title;
    box.querySelector(".e3ds-result-body").textContent = JSON.stringify(obj, null, 2);
    box.style.display = "flex";
}
function e3dsSendAppMessage(message) {
    if (e3dsAppMessageBox) { e3dsAppMessageBox.value = JSON.stringify(message); e3dsAppMessageBox.e3dsRefresh(); }
    sendToUnrealApp(message);
}

const E3DS_APP_CONTROLS = {
    /* The car configurator: a colour name, as a plain string. (The E3DS Features Template is deliberately not
     * listed - it is the example of an app with no controls here.) */
    "AutomotiveConfigurator": [
        { label: "Car colour", placeholder: "Select a colour",
          options: [["Red", "red"], ["Black", "black"], ["White", "white"], ["Silver", "silver"], ["Blue", "blue"]] },
    ],
    /* Epic's Pixel Streaming sample. */
    "EpicPixelStreamingSample": [
        ["Character: Crunch", { Character: "Crunch" }], ["Character: Aurora", { Character: "Aurora" }],
        ["Skin 1", { Skin: "0" }], ["Skin 2", { Skin: "1" }], ["Skin 3", { Skin: "2" }],
    ],
};

let e3dsGatedForApp = null;      // the app the current buttons were built for

/**
 * Add or remove the app-specific buttons for a named app.
 *
 * @param {string} appName the app believed to be streaming
 * @param {string} source  where that belief came from, for the log
 */
function e3dsApplyAppGating(appName, source) {
    /* [E3DS-DEMO-STAGES] App buttons SEND a message, so they belong to the channel stage like every other sender.
     * They used to be added at page load (from the URL), so on a phone they sat on the loading screen before any
     * stream existed. Before the channel opens: decide nothing - e3dsBuildChannelControls() calls this again. */
    if (!e3dsChannelStageBuilt) return;
    const app = appName || "";
    if (app === e3dsGatedForApp) return;         // nothing has changed
    e3dsGatedForApp = app;

    /* Start from none. Changing the URL to a different app has to take the old
     * app's buttons away, or the panel keeps offering them. */
    const panel = document.getElementById("demoButtonPanel");
    if (panel) {
        panel.querySelectorAll('[data-app-specific="1"]').forEach((el) => el.remove());
    }

    const mark = (el) => { el.dataset.appSpecific = "1"; el.dataset.needs = E3DS_STAGE_CHANNEL; return el; };
    const controls = E3DS_APP_CONTROLS[app];

    if (!controls) {
        console.log('[E3DS demo] No app controls for "' + app + '" (from ' + source + "). Add it to " +
            "E3DS_APP_CONTROLS in demo-ui-panel.js if your app handles some.");
        const note = document.createElement("div");
        note.className = "demo-empty-note";
        note.textContent = "No app controls available for this app.";
        e3dsCategorySection("Your app").prepend(mark(note));
        return;
    }

    console.log('[E3DS demo] Adding the app controls for "' + app + '" (from ' + source + ").");
    const section = e3dsCategorySection("Your app");
    const first = section.firstChild;
    controls.forEach((control) => {
        let el;
        if (Array.isArray(control)) {
            const [label, message] = control;
            el = addDemoButton(label, () => e3dsSendAppMessage(message), "Your app", E3DS_STAGE_CHANNEL);
        } else {
            const select = addDemoSelect(control.label, { placeholder: control.placeholder },
                (value) => { if (value !== "") e3dsSendAppMessage(control.options[Number(value)][1]); },
                "Your app", E3DS_STAGE_CHANNEL);
            control.options.forEach(([label], i) => {
                const option = document.createElement("option");
                option.value = String(i);
                option.textContent = label;
                select.appendChild(option);
            });
            el = select.parentNode;
        }
        section.insertBefore(mark(el), first);    // above the message box, in table order
    });
}

/** The player has told us what is really streaming; it outranks the URL. */
function e3dsOnAppInfo(info) {
    e3dsApplyAppGating((info && info.appName) || "", "the player");
}

/* [E3DS-DEMO-STAGES] The panel listens for the two moments it stages on.
 *
 * A SECOND LISTENER, deliberately. iframe-events.js is the worked example of
 * handling platform events in an integration; this one is the panel keeping
 * itself in step. Routing the panel's own staging through the example would
 * make the example about the panel.
 *
 * The dotted names are used because those are the ones this demo handles
 * everywhere else. Each of these also arrives twice more - under its old
 * numbered name and under the SDK's callback name - which is why the guard
 * below only acts on the dotted spelling.
 */
/* ══════════════════════════════════════════════════════════════════════════
 * [E3DS-CAPABILITY-PROBE] Ask what this player can do, and mark what it cannot.
 *
 * Six commands - setVolume, captureScreenShot, toggleFullscreen,
 * useViewportResolution, ForceEndSession and sendDeviceInfo - arrived with the
 * iframe/SDK parity change. A player deployed before it does not reject them:
 * an unrecognised cmd falls off the end of its dispatcher in silence. The
 * viewer presses Screenshot, nothing happens, and there is nothing anywhere to
 * say why.
 *
 * THE PROBE IS ONE OF THE SIX. sendDeviceInfo answers with takeUserDeviceInfo,
 * and the reply is sent whether or not there is anything to report - so an
 * answer means the player has the parity change and all six work, and silence
 * means it does not and none of them do. One question settles all six.
 *
 * WHY A TIMER IS ACCEPTABLE HERE. Five seconds is far longer than a round trip
 * to a stream that is already playing. A slow answer therefore marks the
 * controls and then unmarks them when it arrives - late and correct, rather
 * than never.
 *
 * WORTH COPYING INTO YOUR OWN PAGE. Not this table - the habit. If a control
 * depends on something you cannot verify, say so on the control instead of
 * letting the viewer discover it by pressing.
 * ══════════════════════════════════════════════════════════════════════════ */

const E3DS_NEEDS_PARITY_BUILD = [
    "Volume", "Screenshot", "Match window resolution",
    "Terminate stream", "Device info"
];

let e3dsParityAnswered = false;
let e3dsParityProbeSent = false;

/** Dim the controls this player cannot serve, and say why on each one. */
function e3dsMarkParityControls(available) {
    const panel = document.getElementById("demoButtonPanel");
    if (!panel) return;

    E3DS_NEEDS_PARITY_BUILD.forEach((label) => {
        Array.from(panel.querySelectorAll(".demo-button")).forEach((el) => {
            if ((el.textContent || "").trim().indexOf(label) !== 0) return;
            if (available) {
                el.removeAttribute("data-unavailable");
                el.title = "";
                el.style.opacity = "";
            } else {
                el.dataset.unavailable = "1";
                el.style.opacity = "0.45";
                el.title = label + " needs a newer platform build than the one "
                    + "streaming here. The command is sent and ignored - nothing "
                    + "is broken on your side.";
            }
        });
    });
}

/** Ask once, when there is a stream to ask. */
function e3dsProbePlayerCapabilities() {
    if (e3dsParityProbeSent) return;
    e3dsParityProbeSent = true;

    sendCommandToStream("sendDeviceInfo", "");

    setTimeout(() => {
        if (e3dsParityAnswered) return;
        e3dsMarkParityControls(false);
        window.e3dsLogAppResponse(
            "this player did not answer sendDeviceInfo, so it predates the "
            + "iframe/SDK parity change. Volume, Screenshot, Match window "
            + "resolution, Terminate stream and Device info are dimmed because "
            + "the commands would be ignored in silence.",
            "note", "capabilities");
    }, 5000);
}

/** The answer, whenever it comes. */
function e3dsNoteParityAnswer() {
    if (e3dsParityAnswered) return;
    e3dsParityAnswered = true;
    e3dsMarkParityControls(true);
}
window.e3dsNoteParityAnswer = e3dsNoteParityAnswer;

/* [E3DS-LEGACY-STAGE-NAMES] The same event under whichever name arrives.
 *
 * The platform announces its lifecycle twice: the original names, which every
 * deployment has always sent, and the modern dotted ones. THE DOTTED NAMES ARE
 * NOT EVERYWHERE YET - a player that predates them sends only the left-hand
 * column, and listening for the right-hand one alone is how this panel came to
 * sit at six controls against a stream that was playing perfectly.
 *
 * So the switch below resolves a legacy name to its modern equivalent first,
 * and then has exactly one case per event. When both names arrive - which is
 * what a current player does - the second is harmless: the channel stage is
 * guarded by a flag, and the video stage removes its own controls before it
 * rebuilds them.
 *
 * Keep this in step with E3DS_LIFECYCLE_EVENTS in the player. It is a subset:
 * only the events this panel acts on need to be here.
 */
const E3DS_LEGACY_STAGE_NAMES = {
    "bidirectionalChannelBetweenUnrealAndIframeReady": "stream.channelOpen",
    "stage5_playBtnPressed":                           "stream.playing",
    "DataChannelClose":                                "stream.channelClosed",
    "redirectingWithMessage":                          "session.ending",
    "sessionExpired":                                  "session.expired",
    "videoStreamFailed":                               "stream.failed",
    "handleStreamerDisconnected":                      "app.stopped"
};

window.addEventListener("message", (e) => {
    let msg = e.data;
    if (typeof msg === "string") { try { msg = JSON.parse(msg); } catch (_) { return; } }
    if (!msg || !msg.type) return;

    /* [E3DS-LEGACY-STAGE-NAMES] Whichever name the player used, act on one. */
    const type = E3DS_LEGACY_STAGE_NAMES[msg.type] || msg.type;

    /* [E3DS-DEMO-STAGES] A BUILDER THAT THROWS MUST NOT VANISH SILENTLY.
     *
     * These run from a message handler, so an exception inside one is caught by
     * nothing, reaches no user-facing surface, and leaves a panel missing a
     * whole section with no clue why. That is exactly how "the graphs and the
     * console box are gone" looked from the outside. */
    const stage = (name, build) => {
        try {
            build();
        } catch (e) {
            console.error("[E3DS demo] the " + name + " controls failed to build:", e);
            window.e3dsLogAppResponse(
                (e && e.message) ? e.message : String(e), "err", name + " controls");
        }
    };

    switch (type) {
        case "appInfo":
            e3dsOnAppInfo(msg);
            break;

        /* The channel to Unreal is open: anything that sends a message works
         * from here on. */
        case "stream.channelOpen":
            stage("channel", e3dsBuildChannelControls);
            break;

        /* Frames are arriving. Picture, sound, input and Terminate mean
         * something only from this point. */
        case "stream.playing":
            stage("video", e3dsBuildVideoControls);
            /* [E3DS-CAPABILITY-PROBE] The controls that need a newer player
             * have just been added, so now is when to find out. */
            stage("capability probe", e3dsProbePlayerCapabilities);
            break;

        /* [E3DS-CAPABILITY-PROBE] The probe's answer - and the device info
         * itself, which iframe-events.js logs. */
        case "takeUserDeviceInfo":
            e3dsNoteParityAnswer();
            break;

        /* And back the other way. A control left behind after the thing it
         * needs has gone is the same broken button, just later. */
        case "stream.channelClosed":
            e3dsChannelStageBuilt = false;
            e3dsRemoveControlsNeeding(E3DS_STAGE_CHANNEL, E3DS_STAGE_VIDEO);
            break;

        case "session.ending":
        case "session.expired":
        case "stream.failed":
        case "app.stopped":
            e3dsChannelStageBuilt = false;
            e3dsRemoveControlsNeeding(E3DS_STAGE_CHANNEL, E3DS_STAGE_VIDEO);
            break;

        default:
            break;
    }
}, false);


/* [E3DS-DEMO-PHONE] One panel at a time on a phone.
 *
 * On a narrow screen the menu, the controls and the log all opened together and covered the stream. Here every
 * one of them starts closed; two small buttons (Iframe controls, Log) open one at a time as a sheet along the bottom
 * (styles: css/demo-ui-panel.css), and opening anything - including the menu - closes the rest.
 *
 * "A phone" = a narrow window OR a touch screen. Width alone missed phones held sideways and in-app browsers that
 * lay the page out at desktop width; both got the desktop layout with every panel open over the stream. A mouse
 * on a wide window keeps the desktop layout. */
const E3DS_PHONE_WIDTH = window.matchMedia("(max-width: 820px), (pointer: coarse)");
const E3DS_PHONE_PANELS = ["demoButtonPanel", "appResponsePanel"];

function e3dsPhoneCloseAll(except) {
    E3DS_PHONE_PANELS.forEach((id) => {
        if (id === except) return;
        const el = document.getElementById(id);
        if (el) el.classList.remove("e3ds-phone-open");
        const b = document.querySelector('#e3dsPhoneBar button[data-panel="' + id + '"]');
        if (b) b.classList.remove("on");
    });
}

function e3dsPhoneToggle(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const opening = !el.classList.contains("e3ds-phone-open");
    e3dsPhoneCloseAll(id);
    const sidebar = document.getElementById("sidebar");
    if (opening && sidebar && sidebar.classList.contains("show")) toggleSidebar();
    el.classList.toggle("e3ds-phone-open", opening);
    const b = document.querySelector('#e3dsPhoneBar button[data-panel="' + id + '"]');
    if (b) b.classList.toggle("on", opening);
}

function e3dsPhoneLayout() {
    if (!E3DS_PHONE_WIDTH.matches || document.getElementById("e3dsPhoneBar")) return;
    document.body.classList.add("e3ds-phone");

    /* The menu starts open on a wide screen; here it starts closed, like everything else. */
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("show")) toggleSidebar();

    /* Opening the menu closes the panels. */
    const menuButton = document.getElementById("menuButton");
    if (menuButton) menuButton.addEventListener("click", () => e3dsPhoneCloseAll());

    const bar = document.createElement("div");
    bar.id = "e3dsPhoneBar";
    [["Iframe controls", "demoButtonPanel"], ["Log", "appResponsePanel"]].forEach(([label, id]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.dataset.panel = id;
        b.addEventListener("click", () => e3dsPhoneToggle(id));
        bar.appendChild(b);
    });
    document.body.appendChild(bar);

    e3dsPhoneSheetResize("appResponsePanel", "log");
    e3dsPhoneSheetResize("demoButtonPanel", "controls");
}

/* On a phone the log and the controls are sheets along the bottom. A sheet's top bar resizes it instead of moving
 * it: drag up for more of the panel, down for more stream. Touch browsers show no resize corner, so this is the only
 * way to size it with a finger. */
function e3dsPhoneSheetResize(panelId, what) {
    const log = document.getElementById(panelId);
    const handle = log && log.querySelector(".demo-drag-handle");
    if (!handle) return;
    handle.title = "Drag up or down to resize the " + what;
    let startY = 0, startH = 0, sizing = false;
    handle.addEventListener("pointerdown", (e) => {
        startY = e.clientY;
        startH = log.getBoundingClientRect().height;
        sizing = true;
    });
    handle.addEventListener("pointermove", (e) => {
        if (!sizing) return;
        const h = Math.max(120, Math.min(startH + (startY - e.clientY), window.innerHeight * 0.85));
        log.style.setProperty("height", Math.round(h) + "px", "important");
        log.style.setProperty("max-height", "85vh", "important");
    });
    const stop = () => { sizing = false; };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
}


/* Built at page load, not when the stream connects.
 *
 * The SDK panel waits for the data channel because its buttons call into a
 * player object that does not exist before then. Nothing here does: every
 * button posts a message at the frame, and a message sent before the stream is
 * ready is simply ignored. So the panel can exist from the start, which is also
 * when someone is most likely to want Restart. */
function e3dsStartDemoPanel() {
    buildDemoPanel();
    e3dsPhoneLayout();   // [E3DS-DEMO-PHONE]
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", e3dsStartDemoPanel);
} else {
    e3dsStartDemoPanel();
}
