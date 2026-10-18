# 07: AI Suggestions — queue and Gemini

**What to build:** Every new photo is queued for AI. Whenever the phone is online and the app is open, queued photos are sent one at a time to `gemini-3.1-flash-lite` with the Area name, Item and the Item's relevant Defect Categories, and up to three AI Suggestions (Defect Type code + High/Medium/Low) come back and show on the Item. Failures stay queued and retry. A status bar shows "Saved on device" and "Waiting for AI: N photos". Introduces the AI client adapter (ADR 0002) with the key injected at build time (ADR 0005). See the spec: AI request contract.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] AI client adapter: (Evidence copy, Area name, Item, relevant Categories, allowed codes) → up to 3 { code, confidence }
- [ ] Gemini called with structured output: `code` is an enum of every Dictionary Defect Type code, `confidence` is High/Medium/Low, array max 3
- [ ] Prompt states the rules: allowed codes only, up to 3, `OT-UNKNOWN` if nothing identifiable, observable facts only
- [ ] Responses are validated against the bundled Dictionary; invalid codes dropped; capped at 3
- [ ] API key comes from a build-time environment variable and is not committed; an example env file documents it
- [ ] Each photo is enqueued exactly once on capture; videos and notes never
- [ ] Queue processes on app open, on coming online and after each capture, only while online, one at a time
- [ ] Failures keep the item queued with an attempt count and retry on the next trigger
- [ ] AI Suggestions are stored separately from Defects with photo, code, confidence, outcome "unreviewed" and timestamps; never overwritten
- [ ] Item shows its AI Suggestions; status bar shows "Saved on device" and "Waiting for AI: N photos"
- [ ] Core tests (fake AI client and Environment) cover enqueue rules, offline hold, retry, validation and separate storage
