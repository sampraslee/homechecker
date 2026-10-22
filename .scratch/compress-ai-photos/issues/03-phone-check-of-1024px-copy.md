# 03: Phone check of the 1024px copy

**What to build:** On a real iPhone and a real Android phone, confirm that the 1024px Evidence Copy still shows defects clearly enough for the AI to suggest the right Defect Type. Record the results on this ticket. See the spec: Compress photos for AI analysis, Testing Decisions (manual check).

**Blocked by:** 01: Photos sent to the AI use a 1024px Evidence Copy

**Status:** ready-for-agent

- [ ] On an iPhone, a photo of a known defect, such as a scratch or damp patch, produces an Evidence Copy with a 1024-pixel longest edge
- [ ] On an iPhone, the AI still suggests the right Defect Type for that photo
- [ ] On an Android phone, the same two checks pass
- [ ] Results, including the phone models and any suggestion that was missed, are written on this ticket
