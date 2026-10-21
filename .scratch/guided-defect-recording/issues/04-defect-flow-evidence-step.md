# 04: Record a Defect: Evidence step

**What to build:** Start the Record a Defect flow from the Item screen and automatically after an Item is added, and build step 1 (Evidence): add photos, video or notes, with Next enabled once there is at least one piece of Evidence. Uses the shell from 03. See the spec: Record a Defect.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] "Record a Defect" starts from the Item screen and straight after adding an Item
- [x] Step 1 captures photos, video and notes using the existing capture behaviour
- [x] Next is disabled until there is at least one piece of Evidence of any kind captured in this flow (Evidence already on the Item does not count). Until ticket 05 builds step 2, Next returns to the Item screen
- [x] Unavailable on a Completed Inspection
- [x] Back leaves the flow without losing captured Evidence
