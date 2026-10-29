# Deploying the prototype

The prototype is a static PWA. It runs in two places, one after the other:

1. **Vercel, for testing now.** A temporary host so testers can try the app and give feedback while it goes through revision rounds.
2. **The company VPS, as the final home.** Once the revisions are done (ticket 15).

The Gemini key goes into the build and ends up inside the app (ADR 0005). It is never committed.

Phones keep their data per web address. The app on Vercel and the app on the VPS are different addresses, so nothing recorded on one carries over to the other (ADR 0004). Tell testers that Inspections recorded on the Vercel version are practice data, and that they should export anything they want to keep (the app already prompts for this). After the move to the VPS they install the app again from the new address.

## Test host: Vercel

The project is on a personal Vercel Hobby account. Vercel limits Hobby to personal, non-commercial use and can pause a deployment without notice. If that happens, the VPS path below is the fallback.

Vercel deploys from `origin`, which is a repo on the personal GitHub account (`sampraslee/homechecker`). The repo is public, so the tickets, ADRs and glossary are readable by anyone; the Gemini key is not in it (`.env*` is gitignored). Commits Vercel deploys must be authored with an email that belongs to that GitHub account. This repo's `user.email` is set to the account's noreply address.

### One-time setup

The order matters: the key must be restricted to the Vercel address before it is put into a build, because the build ends up in a public bundle.

1. In Vercel, choose **Add New → Project**, import `sampraslee/homechecker`, and name the project `home-check`. The build command is `npm run build` and the output directory is `dist`. Do not add any environment variable yet. The first build works but has no AI Suggestions.
2. Read the project's exact address off its **Domains** tab (like `https://home-check.vercel.app`).
3. In **Settings → Git**, turn off preview deployments, so only production deploys exist. Every preview address would need adding to the key's restrictions.
4. Lock down the Gemini key for that address (section below) and set the spending cap.
5. Only then add the key in **Settings → Environment Variables**, as `VITE_GEMINI_API_KEY` in the Production scope only, and redeploy.

### Each deploy

Push `main` to `origin` (`git push`). Every push to `main` goes live to testers, so push only when you mean to ship. Vercel builds it (`npm run build` type-checks first) and publishes to the production address.

`vercel.json` sets the cache headers: `/assets/*` has hashed file names and is cached for a year; everything else, especially `index.html` and `sw.js`, is `no-cache`. After the first deploy, check them:

```bash
curl -sI https://<address>/sw.js | grep -i cache-control
curl -sI https://<address>/index.html | grep -i cache-control
```

Both should say `no-cache`. If they don't, phones keep running an old version of the app.

Phones that installed the app pick up a new deploy the next time they open it online (`registerType: "autoUpdate"`).

## Final host: company VPS

This is the plan for ticket 15, once the revision rounds are done.

### Build the release

1. Put the deploy key in `.env.production.local` as `VITE_GEMINI_API_KEY=…`. Vite reads that file only for builds, and it is gitignored. The build warns if the key is missing; that build works but never gets AI Suggestions.
2. Run `npm run release`. This builds the app and writes `home-check.tar.gz`, which holds the contents of `dist`.
3. Hand `home-check.tar.gz` to whoever runs the VPS, along with the server setup below.

### Server setup (whoever runs the VPS)

The app is plain static files. There is no server code, and no rewrites are needed.

1. **Give it its own address over HTTPS**, e.g. `https://home-check.<company domain>`. HTTPS is required: phones only allow the camera, microphone, service worker and installing to the home screen on a secure page. Use the root of a (sub)domain, not a sub-path, because the app expects to live at `/`.
2. **Unpack the release** into the web root, replacing the old files: `tar -xzf home-check.tar.gz -C /var/www/home-check`.
3. **Configure the web server** from one of the examples, replacing the address and paths:
   - `deploy/Caddyfile` for Caddy, which gets the certificate itself.
   - `deploy/nginx.conf` for nginx, with a certificate from certbot or the company's own.
4. **Keep the cache headers from the examples.** They match `vercel.json`: `/assets/*` can be cached for a year, and everything else, especially `index.html` and `sw.js`, must be `no-cache`.

## Lock down the Gemini key (Google Cloud console)

Under **APIs & Services → Credentials**, open the key:

- **Application restrictions → Websites:** add the app's address with `/*` at the end, e.g. `https://home-check.vercel.app/*` for the test host, or `https://home-check.<company domain>/*` for the VPS. When the app moves to the VPS, add the new address and remove the Vercel one.
- The same key also serves local work, so add `http://localhost:*/*` and `https://localhost:*/*` (for `npm run preview` and the dev server on this computer). The dev server on the LAN, as opened from a phone, has an address that changes; add it by hand only when you need AI Suggestions on a phone that way.
- **API restrictions → Restrict key:** allow only the **Generative Language API**.

Then set a spending cap on the project (ADR 0005), as a spend limit in Google AI Studio's billing settings. A budget under **Billing → Budgets & alerts** only sends alerts and does not stop spending, so it does not meet ADR 0005. If you can't set a hard limit, note that on ticket 14 so the ADR can be revisited.

To check the lockdown, open the deployed app and take a photo while online. The photo should get AI Suggestions. A request from any address not on the list (for example a page on another site using the same key) is refused.

The key is a single one, used for the deployed app and for local work. The deployed copy can be read by anyone who opens the app (ADR 0005), so if it leaks, rotate it in Google Cloud and redeploy with the new value; local work needs the new value in `.env.local` too. For the VPS release, `.env.production.local` overrides `.env.local` at build time.

## Device check (ticket 14)

Run this on one iPhone (Safari) and one Android phone (Chrome), against the deployed address:

1. Open the deployed address and add it to the home screen. Launch it from the icon once while online. On iPhone, the home-screen app keeps its own storage, separate from Safari's. Close it, turn on airplane mode, and launch it from the icon again. It should open.
2. Still offline, start a Move-in. Add Areas and Items, photos, a video, a note and manual Defects.
3. Go online. AI Suggestions arrive. Confirm one, correct one, reject one, then complete the Inspection.
4. Start a Move-out linked to that Move-in. Check that the Areas and Items were copied.
5. Export, then share the zip to email or Drive. Open it on a computer: thumbnails show in Excel, and the "Media" links (the Evidence files) open.
6. Open **Settings → Storage on this phone** and note the result for each phone.

Write up each problem as a new ticket in `.scratch/home-check-prototype/issues/`.
