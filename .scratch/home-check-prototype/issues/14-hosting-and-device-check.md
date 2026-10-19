# 14: Hosting and checks on real phones

**What to build:** Put the prototype on a free static host over HTTPS, lock down the Gemini key, and verify the whole flow by hand on one iPhone and one Android phone, so testers can start. Needs a person: hosting and Google Cloud accounts, and physical phones.

**Blocked by:** 01–13

**Status:** ready-for-human

- [ ] App deployed to a free static host over HTTPS; build injects the Gemini key from an environment variable
- [ ] In Google Cloud: key restricted to the app's web address and the Generative Language API; spending cap set (ADR 0005)
- [ ] iPhone (Safari) and Android (Chrome): install to home screen, launch in airplane mode
- [ ] On each: Move-in with photos, video, note and manual Defects; go online and see AI Suggestions arrive; confirm, correct and reject; complete
- [ ] On each: Move-out linked to that Move-in shows the copied Areas and Items
- [ ] On each: export, share the zip to email or Drive, open it on a computer; thumbnails show in Excel and media links open
- [ ] Persistent-storage result noted for each phone
- [ ] Problems found are written up as new tickets

## Comments

- The dev server (`npm run dev -- --host`) serves HTTPS with a self-signed certificate (`@vitejs/plugin-basic-ssl`), so phones on the LAN get a secure page: the camera, microphone and `crypto.randomUUID` work. Each phone accepts the certificate warning once. `vite preview` stays on HTTP for localhost. A hosted build still needs a real certificate.
- Host: Cloudflare Pages, in the Rizurf Cloudflare account. `npm run deploy` builds and uploads `dist` with Wrangler (direct upload, no git remote needed). The key comes from `.env.local` at build time, and the build warns when it is missing. The steps to do by hand (deploy, key lockdown, the device run-through) are in `docs/deploy.md`.
