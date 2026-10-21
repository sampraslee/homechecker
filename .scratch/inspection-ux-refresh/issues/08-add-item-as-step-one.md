# 08: Add Item as step 1 of Record a Defect

**What to build:** For a new Item, make Add Item the first step of Record a Defect; create the Item when its first Evidence is saved; collapse "All other Items". See the spec: Add Item and Record a Defect.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] New Item path has three steps: Add Item, Evidence, Defect Types; an existing Item keeps two
- [ ] The Item is created when its first piece of Evidence is saved; quitting earlier leaves no Item
- [ ] "All other Items" is collapsed by default
- [ ] Step indicator and Back keep what was entered
- [ ] Core tests for creation timing and the abandoned case
