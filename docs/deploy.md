# Deploying the prototype

The prototype is a static PWA served from a company VPS. The Gemini key goes into the build and ends up inside the app (ADR 0005). It is never committed.

## Build the release

1. Put the deploy key in `.env.production.local` as `VITE_GEMINI_API_KEY=…`. Vite reads that file only for builds, and it is gitignored. The build warns if the key is missing; that build works but never gets AI Suggestions.
2. Run `npm run release`. This builds the app and writes `home-check.tar.gz`, which holds the contents of `dist`.
3. Hand `home-check.tar.gz` to whoever runs the VPS, along with the server setup below.

## Server setup (whoever runs the VPS)

The app is plain static files. There is no server code, and no rewrites are needed.

1. **Give it its own address over HTTPS**, e.g. `https://home-check.<company domain>`. HTTPS is required: phones only allow the camera, microphone, service worker and installing to the home screen on a secure page. Use the root of a (sub)domain, not a sub-path, because the app expects to live at `/`.
2. **Unpack the release** into the web root, replacing the old files: `tar -xzf home-check.tar.gz -C /var/www/home-check`.
3. **Configure the web server** from one of the examples, replacing the address and paths:
   - `deploy/Caddyfile` for Caddy, which gets the certificate itself.
   - `deploy/nginx.conf` for nginx, with a certificate from certbot or the company's own.
4. **Keep the cache headers from the examples.** `/assets/*` has hashed file names, so it can be cached for a year. Everything else, especially `index.html` and `sw.js`, must be `no-cache`. If those files get cached, phones keep running an old version.

Phones that installed the app pick up a new release the next time they open it online (`registerType: "autoUpdate"`).

## Lock down the Gemini key (Google Cloud console)

Under **APIs & Services → Credentials**, open the key:

- **Application restrictions → Websites:** add the app's address with `/*` at the end, e.g. `https://home-check.<company domain>/*`.
- **API restrictions → Restrict key:** allow only the **Generative Language API**.

Then set a spending cap on the project (ADR 0005), as a spend limit in Google AI Studio's billing settings. A budget under **Billing → Budgets & alerts** only sends alerts and does not stop spending, so it does not meet ADR 0005. If you can't set a hard limit, note that on ticket 14 so the ADR can be revisited.

To check the lockdown, open the deployed app and take a photo while online. The photo should get AI Suggestions. Then, from localhost (`npm run preview`, using the same key), the status bar should keep showing "Waiting for AI", because the key refuses that address.

Once the key is restricted, it no longer works from localhost or from the dev server on the LAN. For AI Suggestions during development, put a second key in `.env.local` and restrict it to the Generative Language API. Builds keep using the deploy key, because `.env.production.local` overrides `.env.local`.

## Device check (ticket 14)

Run this on one iPhone (Safari) and one Android phone (Chrome):

1. Open the deployed address and add it to the home screen. Launch it from the icon once while online. On iPhone, the home-screen app keeps its own storage, separate from Safari's. Close it, turn on airplane mode, and launch it from the icon again. It should open.
2. Still offline, start a Move-in. Add Areas and Items, photos, a video, a note and manual Defects.
3. Go online. AI Suggestions arrive. Confirm one, correct one, reject one, then complete the Inspection.
4. Start a Move-out linked to that Move-in. Check that the Areas and Items were copied.
5. Export, then share the zip to email or Drive. Open it on a computer: thumbnails show in Excel, and the "Media" links (the Evidence files) open.
6. Open **Settings → Storage on this phone** and note the result for each phone.

Write up each problem as a new ticket in `.scratch/home-check-prototype/issues/`.
