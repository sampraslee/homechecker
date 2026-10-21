# 06: Record a Defect: AI Suggestions in step 2

**What to build:** Feed AI Suggestions into step 2. If the photo already has AI Suggestions, show them first as one-tap choices above the picker. While online and pending, show a "Looking for suggestions…" row; after 10 seconds replace it with "Suggestions are taking longer than usual. Carry on and they'll appear in the AI Suggestions list." Offline, show a quiet note, not a spinner. The picker is never blocked, and late suggestions still arrive in the Item's AI Suggestions list. See the spec: step 2 and ADR 0002.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] Existing AI Suggestions for the photo appear first as one-tap choices
- [x] Pending suggestions show a loading row only while online
- [x] After 10 seconds the loading row becomes the "taking longer than usual" message
- [x] Offline shows a note instead of a spinner
- [x] The picker is usable throughout
- [x] Choosing an AI Suggestion makes the AI-suggested Defect at once, with its Severity to be asked in step 3 (core: `withoutSeverity`), like any other Defect
- [ ] Tests cover pending, timed-out, offline and already-arrived cases. The core part has a test (confirm now, Severity later); the screen states have no automated test because the repo has no UI test setup, and were checked by hand in the browser (loading row, 10-second message, offline note, arrived chips)
