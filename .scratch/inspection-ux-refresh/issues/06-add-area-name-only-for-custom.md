# 06: Add Area: Name it only for custom Areas

**What to build:** Skip step 2 for a standard Area (use its default name); keep it for "Not in the list". See the spec: Add Area.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Picking a standard Area and tapping Next creates the Area with its default name ("Bedroom 2" when one exists) and lands in it
- [x] "Not in the list" goes on to the Name it step
- [x] A standard Area whose name the Inspection already has (a second bathroom) also goes on to Name it, prefilled with the next free name ("Common Bathroom 2")
- [x] Step indicator shows one step for standard Areas and two for custom
- [x] A standard Area can still be renamed afterwards
