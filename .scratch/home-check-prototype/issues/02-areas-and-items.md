# 02: Areas and Items

**What to build:** Inside a Draft Inspection, the Inspector adds Areas from the standard list or with a custom name, renames them, and adds Items from the Item Catalog — with the Items relevant to the Area shown first, repeated Items distinguished by a short name, and "Other item" with free text. The standard Area list and Item Catalog are bundled, versioned reference data (initial content: brief Appendices A and B). See the spec: Domain rules, Reference data.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Standard Area list and Item Catalog load as reference data; replacing them needs no code change
- [x] Add Area from the standard list or with a custom name; the same standard Area can be added more than once with distinct names
- [x] Rename an Area; remove an Area only while Draft and only if it has no Items (the "only while Draft" check is deferred to 06)
- [x] Item picker shows the Area's relevant Items first; every catalog Item is reachable from any Area
- [x] Same catalog Item can be added multiple times in an Area, each with an optional short name
- [x] "Other item" with a required free-text name
- [x] Rename or remove an Item while Draft (the "only while Draft" check is deferred to 06)
- [x] Core tests cover repeated Areas and Items, removal rules and relevant-first ordering

## Comments

- Built without Draft checks: no Inspection can be Completed until 06, so they can't be tested yet. 06 adds the lock for addArea, renameArea, removeArea, addItem, renameItem and removeItem.
- Area names are unique within an Inspection, ignoring case. Re-adding a standard Area numbers it ("Bedroom", "Bedroom 2", ...).
- An Other item is an Item with `catalogItemId: null`. It isn't an entry in the Item Catalog data, so 04 should treat "no catalog Item" as "all Defect Categories".
