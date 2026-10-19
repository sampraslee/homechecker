# 08: Reviewing AI Suggestions

**What to build:** The Inspector confirms, corrects or rejects each AI Suggestion. Confirming creates a Defect on that Item with the photo as Evidence — or, if the Item already has that Defect Type, links the photo to the existing Defect. Correcting records the chosen Defect Type as the Defect. Defects from AI are marked AI-suggested. Review still works on Completed Inspections, and the completion check reports waiting photos and unreviewed suggestions. See the spec: Domain rules (AI Suggestions, locking exception).

**Blocked by:** 06, 07

**Status:** ready-for-agent

- [x] Confirm → Defect with source "AI-suggested", link to the AI Suggestion, the photo as Evidence, current Dictionary version
- [x] Confirm when the Item already has that Defect Type → photo linked to the existing Defect, no new Defect
- [x] Correct → Inspector picks a Defect Type (same picker as manual); Defect created or existing one linked; outcome "corrected" with the corrected code
- [x] Reject → outcome "rejected", no Defect
- [x] AI Suggestion outcomes never change confirmed Defects afterwards
- [x] List of unreviewed AI Suggestions per Inspection
- [x] On a Completed Inspection, AI processing and review still work and may add Defects or links; all other edits stay locked
- [x] Completion confirmation shows counts of photos waiting for AI and unreviewed AI Suggestions
- [x] Core tests cover each outcome, confirm-onto-existing, and the Completed exception

## Comments

- From 04: `DefectSource` is only `"manual"` for now; add `"ai-suggested"` and the AI Suggestion link here. `addDefect` refuses `OT` Defect Types without a note (`noteRequired` on the Category). Decide whether confirming an `OT-UNKNOWN` AI Suggestion needs a note, or is exempt.
- The duplicate refusal already returns `existingDefectId`, which confirm-onto-existing can reuse.
- From 06: the lock is a per-operation check in `src/core/homeCheck.ts` (`isLocked(inspectionId)` → `inspection-completed`) inside `addDefect`, `editDefect` and the others. Review outcomes on a Completed Inspection must not go through those public operations. Write the Defect or link through storage directly (or a shared internal helper that skips the lock). `CompletePanel` in `src/ui/InspectionScreen.tsx` is where the AI counts go.
- Done. Core operations: `confirmAiSuggestion(id, { note? })`, `correctAiSuggestion(id, { defectTypeCode, note? })`, `rejectAiSuggestion(id)`, `listUnreviewedAiSuggestions(inspectionId)` (Area → Item order, with Area and Item names) and `aiWorkLeft(inspectionId)` → `{ waitingForAi, unreviewedAiSuggestions }`. Tests are in `src/core/aiReview.test.ts`.
- Confirm and correct share `acceptAiSuggestion`. It skips the Completed lock and writes the reviewed suggestion and the Defect together through `Storage.saveAiReview`, in one transaction. A new Defect has `source: "ai-suggested"`, `aiSuggestionId`, the current Dictionary version and the photo as its only Evidence. If the Item already has that Defect Type, the photo is added to that Defect's `evidenceIds` and nothing else changes: it keeps its source, note and `aiSuggestionId`. The result's `addedToExisting` says which one happened.
- `OT` decision: a review that would make a **new** Defect of a `noteRequired` Category is refused with `note-required` until a note is given (the UI then asks for one). This is the same rule as `addDefect`, and on a Completed Inspection the note could not be added later. Adding the photo to an existing `OT` Defect needs no note.
- Correcting to the Defect Type the AI already suggested counts as **confirmed**, so the trial's correct rate isn't inflated. A reviewed suggestion can't be reviewed again (`ai-suggestion-already-reviewed`). Reviews notify `onAiChange` listeners.
- UI: `src/ui/AiSuggestionList.tsx` on the Item screen (Confirm / Correct / Reject; Correct uses the same Defect Type picker as manual). It works on Completed Inspections too. The Inspection screen lists "AI Suggestions to review", and the completion panel shows both counts. AI-suggested Defects carry a badge.
- For 10: deleting a photo (Draft only) still deletes all of its AI Suggestions, including reviewed ones, so those outcomes leave the AI Suggestions sheet. An AI-suggested Defect made from that photo then keeps an `aiSuggestionId` that points at nothing (its source stays "ai-suggested"). Decide whether the export needs reviewed suggestions kept. A manual Defect that gains an AI-confirmed photo stays `source: "manual"`.
- Known gap, shared with `addDefect`: two reviews of the same Defect Type on one Item that run at exactly the same moment could both create a Defect, because the duplicate check is outside the write transaction. The UI makes this unlikely.
