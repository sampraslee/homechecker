# 15: Move the app to the company VPS

**What to build:** After the revision rounds on the Vercel test host (ticket 14), put the app on the company VPS over HTTPS and retire the Vercel test deployment. Needs a person: VPS access (someone else runs it), the Google Cloud console, and physical phones. The web server isn't known yet.

**Blocked by:** 14, and the revision rounds that follow it

**Status:** needs-info

- [ ] Confirm what the VPS runs (Caddy, nginx or other) and which address it will have
- [ ] Decide whether the VPS release is still a prototype for testers. ADR 0005 says the key moves behind a server-side function before any production build
- [ ] `npm run release` handed over with the setup steps in `docs/deploy.md`; app served over HTTPS at the root of its own (sub)domain, with the cache headers from `deploy/`
- [ ] In Google Cloud: VPS address added to the key's website restrictions and the Vercel address removed; spending cap still set (ADR 0005)
- [ ] Device check from `docs/deploy.md` repeated on one iPhone and one Android phone
- [ ] Testers told to export anything to keep from the Vercel version, then install the app again from the new address
- [ ] Vercel test deployment turned off

## Comments

- Phones keep data per web address (ADR 0004), so nothing recorded on the Vercel version carries over to the VPS.
