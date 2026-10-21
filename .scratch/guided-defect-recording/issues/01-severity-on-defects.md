# 01: Severity on Defects

**What to build:** Add Severity to the core and to the Item screen. A Defect can have a Severity of Minor, Moderate or Major; confirming an AI Suggestion asks for one; editing a Defect shows it; Defect chips show a small Severity mark, or "Severity needed" when missing. See the spec: Rules, and ADR 0007.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Core: Defect has an optional Severity. Adding a Defect by hand may omit it (the guided flow saves the Defect first, then asks); confirming or correcting an AI Suggestion into a new Defect requires one, including on a Completed Inspection
- [x] Existing Defects without a Severity remain valid and are shown as "Severity needed"
- [x] Defect edit panel can set or change Severity while the Inspection is a Draft
- [x] Confirming an AI Suggestion asks for a Severity before the Defect is made
- [x] Defect chips on the Item screen show the Severity mark
- [x] Core tests cover the required rule on every path and legacy Defects
