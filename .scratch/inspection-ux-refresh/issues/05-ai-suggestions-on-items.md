# 05: AI Suggestions only on Items, with badges

**What to build:** Remove the Inspection-level AI Suggestions list; show an unreviewed count badge on Item and Area cards; a rejected suggestion is hidden from the Item but kept on record. See the spec: AI Suggestions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] AI Suggestions section removed from the Move-in / Move-out screen
- [x] Item cards and Area cards show an "n to review" badge
- [x] A rejected suggestion disappears from the Item list; Export's AI Suggestions sheet still lists it as Rejected
- [x] Undo on reject still restores it while available
- [x] Core tests for badge counts and the rejected case
