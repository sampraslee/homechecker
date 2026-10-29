# 14: Test deploy on Vercel and checks on real phones

**What to build:** Put the prototype on Vercel over HTTPS as a temporary test host, lock down the Gemini key, and verify the whole flow by hand on one iPhone and one Android phone, so testers can start and give feedback while the app goes through revision rounds. The final home is the company VPS (ticket 15). Needs a person: a Vercel account, a Google Cloud account, and physical phones.

**Blocked by:** 01–13

**Status:** ready-for-human

- [ ] Vercel project connected to `origin` (the public repo on the personal GitHub account); pushing `main` deploys; preview deployments off; the Gemini key comes from the project's Production environment variable, added only after the key is restricted (see `docs/deploy.md`)
- [ ] Cache headers checked on the deployed address: `sw.js` and `index.html` are `no-cache` (see `docs/deploy.md`)
- [ ] In Google Cloud: the one key restricted to the app's Vercel address, `localhost` and the Generative Language API; spending cap set (ADR 0005)
- [ ] iPhone (Safari) and Android (Chrome): install to home screen, launch in airplane mode
- [ ] On each: Move-in with photos, video, note and manual Defects; go online and see AI Suggestions arrive; confirm, correct and reject; complete
- [ ] On each: Move-out linked to that Move-in shows the copied Areas and Items
- [ ] On each: export, share the zip to email or Drive, open it on a computer; thumbnails show in Excel and media links open
- [ ] Persistent-storage result noted for each phone
- [ ] Testers told that Inspections recorded on the Vercel version are practice data: export anything to keep, and expect to install again from the VPS address later
- [ ] Problems found are written up as new tickets

## Comments

- The dev server (`npm run dev -- --host`) serves HTTPS with a self-signed certificate (`@vitejs/plugin-basic-ssl`), so phones on the LAN get a secure page: the camera, microphone and `crypto.randomUUID` work. Each phone accepts the certificate warning once. `vite preview` stays on HTTP for localhost. A hosted build still needs a real certificate.
- Host history: Cloudflare Pages first, then the company VPS, and now Vercel as a temporary test host. The VPS stays the final home (ticket 15), so `npm run release`, `deploy/Caddyfile` and `deploy/nginx.conf` stay in the repo.
- Vercel runs on a personal Hobby account, which Vercel limits to non-commercial use and can pause without notice. It deploys from `origin`, the repo on the personal GitHub account. The repo is public by choice, so the tickets, ADRs and glossary are readable by anyone; the Gemini key is not in the history. The repo's git email is the account's noreply address so Vercel recognises the commits. The steps to do by hand (setup, deploy, key lockdown, the device run-through) are in `docs/deploy.md`.
- One Gemini key serves both the deployed app and local work, since testing is short and internal. It is restricted to the Vercel address plus `localhost`, with a spending cap (ADR 0005). Setup order matters: restrict the key before adding it to Vercel.
- Ticket 09 noted that the Android share refusal might come from the dev server's self-signed certificate. Recheck it on the deployed address.
