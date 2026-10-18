# 08: Reviewing AI Suggestions

**What to build:** The Inspector confirms, corrects or rejects each AI Suggestion. Confirming creates a Defect on that Item with the photo as Evidence — or, if the Item already has that Defect Type, links the photo to the existing Defect. Correcting records the chosen Defect Type as the Defect. Defects from AI are marked AI-suggested. Review still works on Completed Inspections, and the completion check reports waiting photos and unreviewed suggestions. See the spec: Domain rules (AI Suggestions, locking exception).

**Blocked by:** 06, 07

**Status:** ready-for-agent

- [ ] Confirm → Defect with source "AI-suggested", link to the AI Suggestion, the photo as Evidence, current Dictionary version
- [ ] Confirm when the Item already has that Defect Type → photo linked to the existing Defect, no new Defect
- [ ] Correct → Inspector picks a Defect Type (same picker as manual); Defect created or existing one linked; outcome "corrected" with the corrected code
- [ ] Reject → outcome "rejected", no Defect
- [ ] AI Suggestion outcomes never change confirmed Defects afterwards
- [ ] List of unreviewed AI Suggestions per Inspection
- [ ] On a Completed Inspection, AI processing and review still work and may add Defects or links; all other edits stay locked
- [ ] Completion confirmation shows counts of photos waiting for AI and unreviewed AI Suggestions
- [ ] Core tests cover each outcome, confirm-onto-existing, and the Completed exception
