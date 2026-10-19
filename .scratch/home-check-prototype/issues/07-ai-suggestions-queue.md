# 07: AI Suggestions — queue and Gemini

**What to build:** Every new photo is queued for AI. Whenever the phone is online and the app is open, queued photos are sent one at a time to `gemini-3.1-flash-lite` with the Area name, Item and the Item's relevant Defect Categories, and up to three AI Suggestions (Defect Type code + High/Medium/Low) come back and show on the Item. Failures stay queued and retry. A status bar shows "Saved on device" and "Waiting for AI: N photos". Introduces the AI client adapter (ADR 0002) with the key injected at build time (ADR 0005). See the spec: AI request contract.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] AI client adapter: (Evidence copy, Area name, Item, relevant Categories, allowed codes) → up to 3 { code, confidence }
- [x] Gemini called with structured output: `code` is an enum of every Dictionary Defect Type code, `confidence` is High/Medium/Low, array max 3
- [x] Prompt states the rules: allowed codes only, up to 3, `OT-UNKNOWN` if nothing identifiable, observable facts only
- [x] Responses are validated against the bundled Dictionary; invalid codes dropped; capped at 3
- [x] API key comes from a build-time environment variable and is not committed; an example env file documents it
- [x] Each photo is enqueued exactly once on capture; videos and notes never
- [x] Queue processes on app open, on coming online and after each capture, only while online, one at a time
- [x] Failures keep the item queued with an attempt count and retry on the next trigger
- [x] AI Suggestions are stored separately from Defects with photo, code, confidence, outcome "unreviewed" and timestamps; never overwritten
- [x] Item shows its AI Suggestions; status bar shows "Saved on device" and "Waiting for AI: N photos"
- [x] Core tests (fake AI client and Environment) cover enqueue rules, offline hold, retry, validation and separate storage

## Comments

- From 03: a photo can be unprocessed (`processed: false`, no Evidence copy) if resizing failed at capture. `finishPhotoProcessing()` retries these at app start. The AI queue should wait for, or trigger, that retry rather than sending the original.
- From 05: `finishPhotoProcessing()` is now `finishMediaProcessing()`. Evidence is a union by `kind`, and videos also carry `processed` (meaning their thumbnail exists), so "unprocessed" alone doesn't mean photo. Enqueue only in `addPhoto`, and filter on `kind === "photo"` anywhere the queue reads Evidence. Videos and notes must never be queued.
- Done. The `AiClient` port (`src/core/ports.ts`) takes `{ evidenceCopy, areaName, itemName, relevantCategories, allowedCodes }` and returns raw `{ code, confidence }` answers. The core validates them in `validAnswers`, not the adapter, so validation is tested through the core: it keeps only Dictionary codes with a known confidence, each code once, in the AI's order, capped at 3. Gemini lives in `src/adapters/geminiAiClient.ts`: `responseJsonSchema` with a code enum and `maxItems: 3`, temperature 0, and a prompt stating the four rules. The key is `VITE_GEMINI_API_KEY` (`.env.example`; `.env.*` stays ignored). With no key every request fails, so photos stay queued.
- `addPhoto` writes the queue entry in the same transaction as the original. Core operations: `processAiQueue()` (single-flight; a trigger during a run makes it go round again; it stops when offline), `startAiQueue()` (now, on coming online and after each capture; `main.tsx` calls it after `finishMediaProcessing`), `listWaitingForAi()` / `countWaitingForAi()`, `onAiChange(listener)` and `listAiSuggestions(itemId)`. Unprocessed photos get their Evidence copy made by the queue first and are never sent as the original. Smaller-version making is single-flight per photo, so capture and the queue never run it twice at once.
- An answer with nothing valid, or an empty one, takes the photo off the queue with **no** suggestions. The core doesn't invent `OT-UNKNOWN`; the prompt asks the model to return it.
- Deleting a photo (Draft only) also deletes its queue entry and its AI Suggestions, so no suggestion points at missing Evidence. A photo deleted mid-request gets no suggestions and is not put back on the queue. For 10: deleted shots therefore don't appear in the AI Suggestions sheet. Revisit if Rizurf wants them counted.
- For 08: `AiSuggestionOutcome` is only `"unreviewed"`; add the review outcomes there. The "Not reviewed" badge and the AI Suggestions list are on `ItemScreen` (`useAiChanges` reloads it live). Suggestions are kept per photo with `rank`, `suggestedAt` and `dictionaryVersion`.
- Not verified: a real Gemini round trip (no key on this machine), including whether `gemini-3.1-flash-lite` needs a `-preview` suffix. Checked in the preview build: a captured photo shows "Waiting for AI: 1 photo" and stays queued without a key, with no console errors.
