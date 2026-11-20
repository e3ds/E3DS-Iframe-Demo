# @eagle3dstreaming/iframe-embed

Embed an **Eagle 3D Streaming** application (cloud-rendered Unreal Engine) in
your page with an `<iframe>`, and talk to it in both directions: send commands
and your own data, receive the platform's events and your app's messages.

No API key. No dependencies. About 3 kB gzipped. TypeScript types included.

```bash
npm install @eagle3dstreaming/iframe-embed
```

---

## Quick start

```html
<div id="stream" style="width:100%; height:100vh"></div>
```

```js
import { createE3dsIframe } from "@eagle3dstreaming/iframe-embed";

const stream = createE3dsIframe({
  container: "#stream",
  // from your Control Panel:
  url: "https://connector.eagle3dstreaming.com/v5/<owner>/<AppName>/<configuration>"
});

stream.on("stream.playing", () => {
  stream.sendMessageToStreamingBuild({ action: "setColour", colour: "red" });
});
stream.on("appMessage", (msg) => console.log("your app says", msg));
stream.on("session.ending", (e) => showMyEndScreen(e.message));
```

Try it with the public sample app:
`https://connector.eagle3dstreaming.com/v5/demo/EpicPixelStreamingSample/E3DS-Iframe-Demo`

### Without a bundler

```html
<div id="stream" style="height:100vh"></div>
<script src="https://cdn.jsdelivr.net/npm/@eagle3dstreaming/iframe-embed@1/dist/index.umd.js"></script>
<script>
  var stream = E3dsIframe.createE3dsIframe({ container: "#stream", url: "https://connector.eagle3dstreaming.com/v5/..." });
</script>
```

### An iframe you already have

```js
const stream = createE3dsIframe({ iframe: "#myFrame" });   // keeps its src
```

---

## API

`createE3dsIframe(options)` returns a stream object.

| Option | Default | |
|---|---|---|
| `url` | | the stream address |
| `container` | | element or selector to create the iframe in |
| `iframe` | | use this existing iframe instead |
| `allow` | `["fullscreen"]` | frame permissions. Add `"microphone"` only if your app uses one: it costs every visitor a browser prompt. |
| `autoFocus` | `true` | keep keyboard focus on the stream when the player asks for it |
| `log` | `false` | print every message to the console |
| `targetOrigin` | `"*"` | restrict who may receive your commands, e.g. `"https://connector.eagle3dstreaming.com"` |

### Commands (page → app)

| | |
|---|---|
| `sendMessageToStreamingBuild(data)` | your own data to your Unreal app (string or object — whatever your app listens for) |
| `sendConsoleCommand("stat fps")` | an Unreal console command. Never pass visitor-typed text straight through. |
| `setVideoDetailLevel("low" \| "medium" \| "high" \| "ultra")` | quality preset |
| `setVolume(0..1)` | |
| `switchMouseControlSchemeTo("Hovering" \| "Locked")` | |
| `setTouchInputEnabled(bool)` | |
| `pressKey(key)`, `keyDown(key)`, `keyUp(key)` | keys the app sees as real: letters, digits, `Space`, `Enter`, `Escape`, `Tab`, `Backspace`, `Shift`, `Control`, `Alt`, arrows |
| `pressPlay()` | press the play button for the viewer |
| `freezeResolution(w, h)` / `useViewportResolution()` | pin / unpin the resolution |
| `captureScreenshot()` | answered by a `screenshot` event `{ ok, dataUrl, fileName, width, height }` |
| `getDeviceInfo()` | answered by `takeUserDeviceInfo` |
| `getAppInfo()` | answered by `appInfo` |
| `getMicDevices()` / `setMicDevice(id)` | answered by `micDevices` / `micDeviceChanged` (needs `allow: ["fullscreen", "microphone"]`) |
| `terminateSession()` | end the session and release the machine |
| `send(cmd, value)` | any other command the player accepts |

### Events (app → page)

`stream.on(type, fn)` returns an unsubscribe function; also `off(type, fn)`
and `once(type, fn)`. `"*"` receives everything.

| Event | When |
|---|---|
| `session.queued`, `session.queuePositionChanged` | waiting for a machine (`queuePosition`, `queueTotal`) |
| `session.hostFound`, `session.hostReserved` | a machine was found and reserved |
| `build.acquiring`, `build.preparing` (`percent`), `build.started` | the app is downloaded, prepared, launched |
| `stream.ready`, `stream.playing` | video is ready / playing |
| `build.listening` | your app can receive messages |
| `connection.stats` | connection statistics |
| `session.ending` | the session is ending, for any reason; `message` is text for a person |
| `session.expired`, `stream.failed`, `build.stopped`, `session.error` | |
| `appMessage` | **your Unreal app sent something** (object or string) |
| `screenshot`, `takeUserDeviceInfo`, `appInfo`, `micDevices`, `micDeviceChanged`, `viewportResolution`, `keyEmulated`, `commandReceived`, `notice` | answers to commands |

### Other

`focus()` (give the keyboard to the stream), `reload()` (fresh session — call
it from a click), `setUrl(url)`, `destroy()` (stop listening; removes the
iframe if this package created it), `iframe` (the element).

Full manual: <https://learn.eagle3dstreaming.com/wiki/iframe-demo-manual> ·
[embedding with an iframe](https://learn.eagle3dstreaming.com/wiki/embed-stream-using-iframe) ·
[keyboard focus](https://learn.eagle3dstreaming.com/wiki/keyboard-focus) ·
[why a session ended](https://learn.eagle3dstreaming.com/wiki/session-end-messages)

---

## Versions and updates

[Semantic versioning](https://semver.org/): **patch** = fixes, **minor** = new
commands or events (your code keeps working), **major** = something you call
changed.

`npm install` saves `"^1.0.0"`, so

```bash
npm update @eagle3dstreaming/iframe-embed
```

brings in every 1.x release and never a breaking 2.0. `npm outdated` shows when
one is out. On a CDN, `@1` follows the latest 1.x; pin `@1.0.0` to freeze it.

---

## Links

- Live demo: <https://e3ds.github.io/E3DS-Iframe-Demo/>
- Source and demo pages: <https://github.com/e3ds/E3DS-Iframe-Demo>
- Need more control (your own token, the video in your page)? [@eagle3dstreaming/web-sdk](https://www.npmjs.com/package/@eagle3dstreaming/web-sdk)
- Support: support@eagle3dstreaming.com · [Discord](https://discord.com/invite/hMwR2Uxr33)
