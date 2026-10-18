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
