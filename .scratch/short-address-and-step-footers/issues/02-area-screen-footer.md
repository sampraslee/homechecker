# 02: Area screen uses the step footer

**What to build:** `StepFooter` takes a `nextLabel` and an optional `onBack` (omit `onNext` to hide the right button). The Area screen's footer reads `Back` and `Add Item`, with no progress bar, and `Complete` moves under the Items list. See the spec: Footers.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `StepFooter` shows `nextLabel` (default "Next"); Record a Defect looks and behaves as before
- [x] The Area footer reads `Back` (to the Inspection) and `Add Item`
- [x] `Complete` sits under the Items list, still toggles to "Completed" and keeps `aria-pressed`
- [x] While editing, or on a Completed Inspection, `Add Item` and `Complete` hide and `Back` stays
