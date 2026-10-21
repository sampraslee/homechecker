# 08: Add Item as step 1 of Record a Defect

**What to build:** For a new Item, make Add Item the first step of Record a Defect; create the Item when its first Evidence is saved; collapse "All other Items". See the spec: Add Item and Record a Defect.

**Blocked by:** 07

**Status:** ready-for-agent

- [x] New Item path has three steps: Add Item, Evidence, Defect Types; an existing Item keeps two
- [x] The Item is created when its first piece of Evidence is saved; quitting earlier leaves no Item
- [x] "All other Items" is collapsed by default
- [x] Step indicator and Back keep what was entered
- [x] Core tests for creation timing and the abandoned case
