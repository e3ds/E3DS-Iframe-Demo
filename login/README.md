# Login example (iframe)

A very small login in front of an Eagle 3D Streaming stream that is shown in an iframe.
The visitor signs in on your page; only a correct username and password puts the stream
into the iframe.

```
node login/server.js        # Node 18 or newer, no npm install needed
```
then open http://localhost:3000 and sign in as `demo` / `demo123`.

## How it works

```
 browser                                   login/server.js
 ───────                                   ───────────────
 username + password  ── POST /api/login ─▶ check users.json (salted hashes)
                                            ├─ wrong  → 401 { ok:false }
 iframe.src = streamUrl ◀─ { ok:true, streamUrl } ┘ right
```

| file | what it is |
|---|---|
| `server.js` | serves the page and answers `POST /api/login` |
| `users.json` | the users. Passwords are stored as salted scrypt hashes, never as text |
| `add-user.js` | `node login/add-user.js <username> <password> [streamUrl]` adds or updates a user |
| `config.example.json` | the default stream link and port. Copy it to `config.json` (ignored by git) for your own settings |
| `public/index.html`, `public/login.js` | the login form and the iframe |

The stream link is **not** in the page: the server sends it only in the answer to a correct
login, so it cannot be read with "view source" first. A user can have their own link
(`add-user.js ... <streamUrl>`); everyone else gets the one in `config.json`.

## What this protects, and what it does not

This keeps the stream link away from anyone who has not signed in. Once someone has signed
in, the link is in their browser and they could pass it on: an iframe stream link is itself
what grants access. If that matters for you:

- use the **Web SDK** version of this example (`login-example` branch of
  [pixelstreaming-sdk](https://github.com/e3ds/pixelstreaming-sdk)). There the server hands
  out a single-use session token instead of a reusable link, and your Streaming API key never
  leaves the server;
- or also set a password on the stream link itself in the Control Panel.

More: https://learn.eagle3dstreaming.com/wiki/login-in-front-of-a-stream

## Before you use it for real

- Serve it over **https** (put it behind nginx or another reverse proxy) - otherwise the
  password travels in plain text.
- Replace the example user: `node login/add-user.js <you> <a long password>` and delete `demo`
  from `users.json`.
- This example has no sessions or cookies: refreshing the page asks for the password again.
  For a real site, use your existing login system and make it return the stream link the same
  way `server.js` does.
