# 06: Completing and locking an Inspection

**What to build:** The Inspector marks a Draft Inspection Completed after a confirmation step. The completion time is recorded and the Inspection's Areas, Items, Evidence and Defects become read-only. There is no reopening. See the spec: Domain rules (lifecycle).

**Blocked by:** 04

**Status:** ready-for-agent

- [x] "Complete Inspection" shows a confirmation step before completing
- [x] Completing records completed-at time and sets status Completed; Draft → Completed is the only transition
- [x] Core refuses add, edit or remove of Areas, Items, Evidence and Defects on a Completed Inspection
- [x] UI hides or disables editing on Completed Inspections
- [x] Inspection list shows Completed status
- [x] Core tests cover the transition, timestamps and every refused mutation

## Comments

- 02 shipped addArea, renameArea, removeArea, addItem, renameItem and removeItem with no Draft check. The lock and its tests here need to cover all six.
- 03 added addPhoto and deleteEvidence with no Draft check. Include both in the lock and its tests.
- 04 added addDefect, editDefect and removeDefect with no Draft check. Include all three in the lock and its tests. deleteEvidence now also unlinks the photo from Defects, so it must stay locked as a whole.
- 05 added addVideo, addNote and editNote with no Draft check, and notes and videos are deleted through deleteEvidence. Include all four in the lock and its tests (the ticket asks for Draft-only deletion of a video to be tested here).
- Done. `completeInspection(id)` sets `status: "completed"` and `completedAt`; completing again is refused with `inspection-completed` and keeps the first time. The same `inspection-completed` refusal guards all 14 mutations above (deleteEvidence as a whole, so photos, videos and notes alike). Each is tested in `src/core/lifecycle.test.ts` on a Completed Inspection holding an empty Area, an empty Item, a photo linked to a Defect, a video and a note, checking that the refusal leaves the record unchanged.
- Read-only operations (`get*`, `list*`, `getMedia`, `itemChoices`, `defectChoices`) and `finishMediaProcessing` still work after completion. `finishMediaProcessing` only makes the smaller versions of media already captured, so it is not an edit.
- The confirmation step shows Area and Item counts and warns that completion can't be undone. The AI counts asked for in spec story 65 come with 08.
- UI: `useLocked(inspectionId)` hides every editing control on the Inspection, Area and Item screens and shows a notice instead. Controls stay hidden until the lock state is known. Checked in the desktop browser, using the preview build because the pane refuses the dev server's self-signed certificate.
