# 04: Complete this Inspection page and Export after completion

**What to build:** Remove the Finish section; add Complete Inspection and Delete Inspection buttons; the Complete this Inspection page; Export only after completion. See the spec: Move-in / Move-out screen.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Finish section removed; buttons `Complete Inspection` and `Delete Inspection` (Delete unchanged)
- [ ] Own page with totals and non-blocking warnings (incomplete Areas, Defects without Severity, unreviewed AI Suggestions, AI still working); only no Areas blocks
- [ ] `Complete` locks the Inspection; the page then shows Completed with `Export now`
- [ ] Draft Inspections cannot be exported; a Completed one shows `Export` in place of `Complete Inspection`
- [ ] Back gesture before completing changes nothing; navigation tests cover the page
- [ ] Core test that exporting a Draft is refused
