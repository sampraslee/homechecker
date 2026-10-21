# 01: Inspections list tabs and cards

**What to build:** Split the list into Move-ins and Move-outs tabs, newest first by date started, with the new card. See the spec: Inspections list.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Underlined tabs Move-ins | Move-outs; each shows only its type, ordered by date started descending
- [x] Card: Status, gray photo placeholder, Unit number, building name (street if none), date, total Defects, `More info`; whole card opens the Inspection
- [x] `InspectionSummary` carries the total Defect count
- [x] City, postcode and the Exported line leave the card; a Completed, never-exported Inspection keeps the "Only on this phone" nudge
- [x] Tests cover ordering, per-tab filtering and the Defect count
