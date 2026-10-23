# iframe demo (React)

A React page that embeds an Eagle 3D Streaming stream in an `<iframe>` and drives the app from its own sidebar.

- **Live demo:** https://iframe_react.eagle3dstreaming.com/
- **Manual (what every button does):** https://docs.eagle3dstreaming.com/wiki/iframe-demo
- **The plain-HTML iframe demo:** branch `main` of this repository, live at https://e3ds.github.io/E3DS-Iframe-Demo/

Each sidebar button sends `{ cmd: "sendMessageToStreamingBuild", value: { Teleport: <n> } }` into the iframe; the streamed app (the
E3DS Features Template) walks the avatar to feature station <n>.

## How to run iframe react app.

First you have to clone this repo using this command:
### git clone https://github.com/e3ds/E3DS-Iframe-Demo/


Then use this command to change the branch to **iframe-demo-react**:
### git checkout iframe-demo-react


Then run this command to install all dependencies:
### npm install

After installing all dependencies run this command: 
### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.


