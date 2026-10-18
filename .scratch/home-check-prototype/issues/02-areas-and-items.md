# 02: Areas and Items

**What to build:** Inside a Draft Inspection, the Inspector adds Areas from the standard list or with a custom name, renames them, and adds Items from the Item Catalog — with the Items relevant to the Area shown first, repeated Items distinguished by a short name, and "Other item" with free text. The standard Area list and Item Catalog are bundled, versioned reference data (initial content: brief Appendices A and B). See the spec: Domain rules, Reference data.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Standard Area list and Item Catalog load as reference data; replacing them needs no code change
- [ ] Add Area from the standard list or with a custom name; the same standard Area can be added more than once with distinct names
- [ ] Rename an Area; remove an Area only while Draft and only if it has no Items
- [ ] Item picker shows the Area's relevant Items first; every catalog Item is reachable from any Area
- [ ] Same catalog Item can be added multiple times in an Area, each with an optional short name
- [ ] "Other item" with a required free-text name
- [ ] Rename or remove an Item while Draft
- [ ] Core tests cover repeated Areas and Items, removal rules and relevant-first ordering
