# 03: AI Suggestions as a flat list grouped by Evidence

**What to build:** The AI Suggestions section becomes a flat list: an Evidence header (thumbnail, kind, time) with suggestion rows beneath and no card chrome. Only unreviewed and rejected suggestions show; rejected rows offer Review again. Update the glossary entry for AI Suggestion. See the spec: AI Suggestions.

**Blocked by:** 02

**Status:** resolved

- [x] The list is grouped by Evidence with a small-thumbnail header
- [x] Confirmed and corrected suggestions are not shown
- [x] Unreviewed rows keep Confirm, Correct and Reject
- [x] Rejected rows show Review again and use the existing undo
- [x] GLOSSARY.md no longer says rejected suggestions are hidden
- [x] Tests cover which suggestions show
- [x] Checked at phone width in the browser preview
