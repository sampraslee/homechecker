# Deploying the prototype

The prototype is a static PWA on Cloudflare Pages, in the Rizurf Cloudflare account. The Gemini key goes into the build and ends up inside the app (ADR 0005). It is never committed.

## First deploy

1. Put the deploy key in `.env.production.local` as `VITE_GEMINI_API_KEY=…`. Vite reads that file only for builds, and it is gitignored. The build warns if it is missing; that build works but never gets AI Suggestions.
2. `npx wrangler login` and sign in to the Rizurf Cloudflare account.
3. `npm run deploy`. This builds and uploads `dist` to the `home-check` Pages project. On the first run, Wrangler offers to create the project; accept, with `main` as the production branch.
4. Note the address it prints, e.g. `https://home-check.pages.dev`. Cloudflare provides the HTTPS certificate.

After that, `npm run deploy` publishes a new version. Phones that installed the app pick it up the next time they open it online (`registerType: "autoUpdate"`).

## Lock down the Gemini key (Google Cloud console)

Under **APIs & Services → Credentials**, open the key:

- **Application restrictions → Websites:** add `https://home-check.pages.dev/*`, using the address from step 4. Add a custom domain here too if you attach one.
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
