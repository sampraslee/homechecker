# 04: Lock AI review on a Completed Inspection

**What to build:** Once an Inspection is Completed, the AI Suggestions section is hidden and review actions are refused in core, so the app matches the exported spreadsheet. Suggestions that arrive later are still stored, unreviewed. Write a new ADR (0008) reversing 'review stays open on a Completed Inspection' and remove that wording from the code comments. See the spec: AI Suggestions.

**Blocked by:** 03

**Status:** resolved

- [x] The section is hidden on a Completed Inspection
- [x] Core refuses confirm, correct, reject and undo on a Completed Inspection
- [x] A suggestion arriving after completion is stored as unreviewed
- [x] ADR 0008 records the reversal and why
- [x] Tests cover the refusal and the late arrival
- [ ] Checked at phone width in the browser preview (not done: hiding the section on a Completed Inspection is not seen in the browser)
