# 11: Move-out Inspections

**What to build:** The Inspector starts a Move-out by picking an earlier Move-in Inspection on this phone. The Move-out copies the Move-in's Unit address, Areas and Items (catalog entry and short name), but no Defects or Evidence, and records the link. If there's no Move-in on this phone, the Inspector starts an unlinked Move-out by typing the address. The export's Inspection sheet shows the linked Move-in. See the spec: Domain rules (Move-out).

**Blocked by:** 02, 09

**Status:** ready-for-agent

- [ ] Start Inspection offers Move-in or Move-out
- [ ] Move-out picker lists Move-in Inspections on this phone (address and date)
- [ ] Linked Move-out copies address, Area names and Items (catalog entry, short name, "Other item" name) — nothing else
- [ ] Unlinked Move-out takes a typed address with the same validation as Move-in
- [ ] Move-out records its linked Move-in (if any)
- [ ] Export Inspection sheet includes linked Move-in address and date
- [ ] Core tests cover copying (structure yes, Defects and Evidence no), unlinked start and the export field
