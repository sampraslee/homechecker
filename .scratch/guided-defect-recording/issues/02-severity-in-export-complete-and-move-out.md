# 02: Severity in the export, Complete confirmation and Move-out reference

**What to build:** Carry Severity into the places beyond the Item screen: the export's Defects sheet gets a Severity column, the Complete confirmation counts Defects missing a Severity (without blocking), and a linked Move-out shows the Move-in's Defects with their Severity as read-only reference.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Export Defects sheet has a Severity column; blank for Defects without one
- [x] Complete confirmation shows how many Defects have no Severity, next to the existing unreviewed AI Suggestion count, and does not block completing
- [x] Move-out Move-in reference shows each Defect's Severity, read-only
- [x] Tests cover the export column and the confirmation count
