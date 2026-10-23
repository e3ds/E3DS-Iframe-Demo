# Omniverse iframe demo

An NVIDIA Omniverse Kit app (USD Viewer) streamed by Eagle 3D Streaming, embedded in an ordinary web page with an
`<iframe>`, and controlled from that page's own HTML panel.

## Demo links

| What | Link |
|---|---|
| The same Omniverse app in the Eagle 3D Streaming player (no web controls) | https://connector_binary.eagle3dstreaming.com/v5/demo/omniverseDemo/usdViewer |
| This page with its web controls | open `index.html` from this branch (it shows the stream above by default) |
| This page with a stream you choose | `index.html?src=https://connector_binary.eagle3dstreaming.com/v5/demo/omniverseDemo/usdViewer` |
| Documentation: Omniverse streaming | https://docs.eagle3dstreaming.com/wiki/omniverse-streaming |

## Why an Omniverse demo needs its own page

An Unreal Engine app usually builds its user interface inside the app, so the stream alone is already interactive.
An Omniverse Kit app is different: its interface lives on the **web page**. Without a page like this one, the stream
shows the scene but there is almost nothing to click. This demo is that page: it rebuilds the panel of NVIDIA's USD
Viewer sample as plain HTML around the Eagle 3D player.

## What it does

- Embeds the Eagle 3D player in an `<iframe>`.
- Shows its own loading steps (waiting for a machine, app download, app start, video) from the messages the player
  posts to the page that embeds it.
- The stage dropdown, the scene tree and **Reset** send the same app messages as NVIDIA's viewer
  (`openStageRequest`, `getChildrenRequest`, `makePrimsPickable`, `selectPrimsRequest`, `resetStage`,
  `loadingStateQuery`) to the player with `postMessage`; the player passes them to the Omniverse app and posts the
  app's answers back.
- The controls stay disabled until the video is playing.

## Run it

Open `index.html` in a browser (or host it on any static web server). No build step, no dependencies.

By default it opens the Eagle 3D Streaming Omniverse demo stream. To use **your own** Omniverse app, add `?src=` with
your stream link:

```
index.html?src=https://connector.eagle3dstreaming.com/v5/<your-username>/<your-app>/<your-configuration>
```

Your configuration must have its platform set to **Omniverse** in the Eagle 3D Streaming control panel.

## Learn more

- Documentation: https://docs.eagle3dstreaming.com
- Other iframe demos: the other branches of this repository
