# 03: Completed Area

**What to build:** Add the Completed Area mark: core rule, Area screen bar, Area card, header and Inspection count. See the spec: Completed Area, GLOSSARY.md and ADR 0003's amendment.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Core: an Area can be marked Completed and unmarked, even with no Items; locked with the Inspection when it is Completed
- [x] Adding, editing or deleting anything in a Completed Area clears the mark
- [x] A Move-out copied from a Move-in starts with no Completed Areas
- [x] Area screen bar: `Add Item` and `Complete` (shows as completed once set; tapping again unmarks it)
- [x] Area card and header show the mark; Move-in / Move-out screen shows "x of y Areas Completed"
- [x] Core tests for each rule above
