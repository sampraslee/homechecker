# 06: Completing and locking an Inspection

**What to build:** The Inspector marks a Draft Inspection Completed after a confirmation step. The completion time is recorded and the Inspection's Areas, Items, Evidence and Defects become read-only. There is no reopening. See the spec: Domain rules (lifecycle).

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] "Complete Inspection" shows a confirmation step before completing
- [ ] Completing records completed-at time and sets status Completed; Draft → Completed is the only transition
- [ ] Core refuses add, edit or remove of Areas, Items, Evidence and Defects on a Completed Inspection
- [ ] UI hides or disables editing on Completed Inspections
- [ ] Inspection list shows Completed status
- [ ] Core tests cover the transition, timestamps and every refused mutation

## Comments

- 02 shipped addArea, renameArea, removeArea, addItem, renameItem and removeItem with no Draft check. The lock and its tests here need to cover all six.
- 03 added addPhoto and deleteEvidence with no Draft check. Include both in the lock and its tests.
