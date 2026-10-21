# 07: Record a Defect: Severity step and Saved screen

**What to build:** Build step 3 (Severity) and the Saved screen. Step 3 asks for a Severity for each Defect made in the flow (nothing preselected, no definitions); Next is disabled until all are set. The Saved screen lists the Defects just recorded with their Severity and offers Record another Defect (back to step 1, empty) and Done (back to the Item screen).

**Blocked by:** 05, 01

**Status:** ready-for-agent

- [x] Step 3 lists each Defect made in the flow once, with Minor / Moderate / Major and nothing preselected
- [x] Next is disabled until every listed Defect has a Severity
- [x] Leaving before this step leaves the Defects saved and marked "Severity needed"
- [x] Saved screen lists the Defects with Severity, with Record another Defect and Done
- [x] Record another Defect starts again at step 1 with an empty Evidence list
