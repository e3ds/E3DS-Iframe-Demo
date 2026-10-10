# Eagle 3D Streaming — iframe demo

Embed a cloud-rendered Unreal Engine application in your own web page with a
single `<iframe>`, and talk to it in both directions.

**One line embeds the stream.** Everything else in this repository exists to
show you what you can say to it afterwards: change quality and resolution, send
keys and your own data, read what the application sends back, and show your own
loading and "session ended" screens instead of ours.

Plain HTML, CSS and JavaScript. No build step, no framework, no `npm install`,
no API key.

---

## The one line

```html
<iframe
  src="https://connector.eagle3dstreaming.com/v5/<owner>/<AppName>/<configuration>"
  allow="fullscreen" allowfullscreen></iframe>
```

That is a working embed. The rest is optional.

---

## Two demos in here

| | |
|---|---|
| **`/`** | the standard demo — the one to start from. No microphone anywhere in it. |
| **`/microphone`** | one file, one subject: letting the viewer **choose which microphone is captured**, and the browser permission rules that make it harder than it looks |

They are separate on purpose, and deliberately unalike. A page that asks for a
microphone costs every visitor a browser prompt before anything starts, and most
integrations do not need one — so the standard demo has none. The microphone
page is the smallest thing that demonstrates the feature: a cross-origin iframe,
a dropdown, and `postMessage` between them. **The whole feature is two
commands** — `getMicDevices` asks the frame what it can see, `setMicDevice` tells
it which one to capture.

---

## Quick start

**1. Point it at your application** in `js/iframe-config.js` — the only file you
have to edit:

```js
streamUrl: "https://connector.eagle3dstreaming.com/v5/<owner>/<AppName>/<configuration>"
```

You get that address from your Control Panel. `<owner>` is the account that owns
the application, and `<configuration>` is the stored configuration to launch.

**2. Open `index.html`.** Double-click it — no server, no build, no install. The
stream starts by itself. Press **F12** to watch every message in the console.

---

## What is in here

| | |
|---|---|
| `index.html` | the page, the `<iframe>`, and the order the scripts load in |
| `js/iframe-config.js` | which application to stream — the only edit needed |
| `js/iframe-commands.js` | everything you can send **to** the stream |
| `js/iframe-events.js` | everything the platform and your app send **back** |
| `js/demo-ui-*.js` | **demo only** — the control panel and this page's buttons. Delete them and the stream still works. |

`iframe-*` is what you integrate. `demo-ui-*` is the demo wrapped around it.

---

## iframe or the Web SDK?

Both stream the same applications from the same platform, and **both offer the
same controls** — the panel in this demo and the panel in the SDK demo are
deliberately the same, so you can compare them and switch between them later
without relearning anything.

| | iframe | [Web SDK](https://github.com/e3ds/pixelstreaming-sdk) |
|---|---|---|
| To embed | one `<iframe>` | a script and a `main()` call |
| An API key | **not needed** | needed, to create session tokens |
| The video element | inside the frame, ours | **in your page, yours** |
| Who may start a session | anyone with the link | **whoever your server gives a token** |
| Talking to the app | `postMessage` | direct JavaScript calls |

The short version: **an iframe is quicker to embed; the SDK gives you control
over who streams and what the page around it does.**

---

## Documentation

Everything else is in one place, kept current:

### **[learn.eagle3dstreaming.com](https://learn.eagle3dstreaming.com/)**

- [iframe demo manual](https://learn.eagle3dstreaming.com/wiki/iframe-demo-manual) — this repository, page by page: what each part does and how to run it
- [Embed with an iframe](https://learn.eagle3dstreaming.com/wiki/embed-stream-using-iframe) — the whole embedding story, including the two silent failures that account for most "data is not arriving" reports
- [Sending and receiving data](https://learn.eagle3dstreaming.com/wiki/sending-and-receiving-data) — messages between your page and your Unreal application, both ways
- [The Unreal side of sending and receiving data](https://learn.eagle3dstreaming.com/wiki/unreal-side-of-data) — what has to exist inside your Unreal application for a message to arrive
- [Typing does not reach the app: keyboard focus](https://learn.eagle3dstreaming.com/wiki/keyboard-focus) — the most common iframe surprise, and the fix
- [Why a session ended](https://learn.eagle3dstreaming.com/wiki/session-end-messages) — every reason a session can end, and what to show your viewer

---

## Support

[Discord](https://discord.com/invite/hMwR2Uxr33) · support@eagle3dstreaming.com
