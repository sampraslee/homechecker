# 03: Guided-flow shell and the Add Area flow

**What to build:** Build the guided-flow shell used by both flows: a full-screen step with a "Step n of N" progress indicator, Back (button and phone gesture) that keeps entered values, and the Dock carrying the one forward action, in the style of the start flow. First consumer is Add Area: step 1 Which Area? (generic placeholder floor plan as a shortcut above the standard-Area chips and the custom-name field; stores nothing) and step 2 Name it (prefilled, numbered if the Area already exists). It lands in the new Area ready to add Items. See the spec: Add Area.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Reusable step header (segmented bar, "Step n of N", title) shared with the address flow; Back that keeps values, and a Dock forward action. The Move-in start flow already had the bar and "Step n of N", so the shell reuses that pattern
- [x] Add Area step 1: tapping a plan room picks the matching standard Area; chips and custom name still work; the plan is marked as a prototype placeholder and stores nothing
- [x] Add Area step 2: name prefilled ("Bedroom", "Bedroom 2" when one exists) and editable
- [x] After step 2 the Inspector lands in the new Area, ready to add Items
- [x] Not offered on a Completed Inspection
- [x] Core tests for default naming of repeated Areas
