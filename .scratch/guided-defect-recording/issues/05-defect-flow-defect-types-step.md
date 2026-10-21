# 05: Record a Defect: Defect Types step

**What to build:** Build step 2 (Defect Types): one piece of Evidence at a time with an "Evidence n of N" count. The Inspector assigns one or more Defect Types with the existing picker, or taps No Defect here. Defects are saved as they are made (ADR 0006: one Defect per Defect Type per Item; assigning a type the Item already has links the Evidence to that Defect).

**Blocked by:** 04

**Status:** ready-for-agent

- [x] Shows one piece of Evidence at a time with an "Evidence n of N" count
- [x] Each piece can take several Defect Types or No Defect here; notes and videos included
- [x] Picking an already-recorded Defect Type links the Evidence to that Defect
- [x] Defects are written as soon as they are assigned, so an interruption loses nothing. Until ticket 07 builds Severity, the flow ends after the last piece, and the new Defects show "Severity needed"
- [x] Defect Types that require a note still ask for it
