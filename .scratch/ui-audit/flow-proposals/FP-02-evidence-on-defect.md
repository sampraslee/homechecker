# FP-02: A Defect is made by assigning a Defect Type to recorded Evidence

Status: built, uncommitted on design/ux-changes (approved with decisions, see "Decisions" at the end). Replaces the earlier options A to D.

Flow changed: F-06 Add Item and record a Defect, F-07 Capture evidence (the link to a Defect), and F-08 Review AI Suggestion (unchanged outcome, same model). Screens: S-05 Item (`ItemScreen.tsx`, `DefectPanels.tsx`).

Issue: UX-012 in `issue-log.md`. Decision draft: `ADR-0006-draft.md` in this folder.

No change happens until you approve it.

## The rule

A Defect exists only as a Defect Type assigned to Evidence the Inspector has recorded on that Item. Evidence comes first, then the Defect Type. "Labelling" in the glossary sense is this assignment; the term to use in code and copy is "assign a Defect Type", because the glossary reserves "label" for the old Defect Category name.

## Before (today)

1. Tap "Add Defect", pick a category, pick a Defect Type. The Defect is recorded at once, with no Evidence needed.
2. The Defect row shows "No Evidence linked". Linking comes later, by reopening the Defect.

## After (proposed)

**Evidence section (Item screen).** Unchanged capture actions: Take photo (Dock), Record video, Add note. Each piece of Evidence shows its state:
- "Not assigned" with an "Assign Defect Type" action, or
- the Defect Types it supports, as chips.

**Assign Defect Type.** Opens the existing Defect Type picker (categories, relevant first). Picking a type:
- creates the Defect, with this Evidence linked as its proof;
- if the type needs a note (the existing `noteRequired` rule), asks for the Defect note first;
- keeps the picker open, so one photo can support several Defects on the same Item (spec story 41).

**Defects section.**
- Hidden when the Item has no Evidence.
- Shown once there is Evidence. If nothing has been assigned yet, it shows the hint "Assign a Defect Type to your Evidence to record a Defect".
- "Add Defect" is removed. Its job moves to the Evidence action above.
- Undo stays, as it is today for a recorded Defect.

**Same Defect Type twice.** Assigning a type already recorded on this Item opens the existing Defect and offers to link this Evidence to it. Spec story 39 is kept: one Defect per type per Item.

**Note-only Evidence.** A note counts as Evidence. A Defect can be supported by a note alone, so the rule doesn't force a photo.

**AI Suggestions.** Confirming a suggestion still creates a Defect with its photo as Evidence. The outcome matches the new rule, so no change to the AI review flow.

**Deleting Evidence.**
- Evidence that supports a Defect can be deleted while the Inspection is a Draft, but only after a confirmation that names the Defects it supports. Those Defects are removed with it.
- Evidence that supports nothing can be deleted, as today, with no confirmation.

**Removing a Defect.** Keeps its Evidence, which becomes "Not assigned". This matches today's "Remove Defect" behaviour.

**Completed Inspections.** Unchanged: all of it is locked.

## Constraints (do not change)

- One Defect per Defect Type per Item (spec story 39).
- Evidence belongs to one Item. A Defect links only Evidence of its own Item (spec, Defect rules).
- One Evidence can support several Defects (spec story 41).
- Defects only, no "good condition" marks (ADR 0003). Evidence with no Defect is still allowed, for example an overview photo.
- Full offline operation.
- The primary goal is time per Inspection. The fast path stays: photo, then type, then done.

## Trade-off

- **Primary goal (time per Inspection):** a Defect with a photo takes the same taps as today: capture, then Assign, category, type. The change only costs time where the Inspector used to record a Defect with no photo at all. Those now need a note first, which takes about as long as the Defect did, since a note is quick.
- **Guardrail (mis-filed Defects):** Defects are tied to what the Inspector captured, so they are harder to mis-file. Duplicates are caught at the point of assignment.
- **Risk:** Inspectors used to adding a Defect straight from the picker may pause to capture first. The Defects section hint makes the step visible.

## Decisions

1. **Unassigned Evidence at Complete:** allow silently. No count, no block.
2. **Duplicate type:** link the Evidence to the existing Defect.
3. **Deleting Evidence that supports a Defect:** remove the Defects with it, after a confirmation that names them.
4. **Hint wording:** "Assign a Defect Type to your Evidence to record a Defect" is approved for now, subject to copy review.

## Decision

- [x] Approved with decisions above
- [ ] Approved as written
- [ ] Rejected
