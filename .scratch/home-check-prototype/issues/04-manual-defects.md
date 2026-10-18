# 04: Manual Defects

**What to build:** On an Item, the Inspector adds a Defect by picking a Defect Category then a Defect Type from the Defect Dictionary, with the Item's relevant Categories first. They add a note and link any of the Item's photos. An Item can't have two Defects with the same Defect Type. The Dictionary is bundled, versioned reference data, loaded exactly as in the blueprint (Appendix C merges are pending approval). See the spec: Domain rules, Reference data.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Defect Dictionary loads as versioned reference data; replacing it needs no code change
- [ ] Picker: Defect Category then Defect Type; Item's relevant Categories first; all Categories reachable
- [ ] Only Defect Types in the bundled Dictionary can be recorded; Other / Unknown available with a note
- [ ] Adding a second Defect with the same Defect Type on the same Item is refused and opens the existing Defect
- [ ] Defect records Defect Type code, Dictionary version, source "manual", note and linked Evidence
- [ ] A Defect can link only photos of its own Item; one photo can link to several Defects
- [ ] Edit note and links, or remove the Defect, while Draft
- [ ] Area and Item views show Defect counts per Item
- [ ] Core tests cover the one-per-Defect-Type rule, Dictionary-only codes, same-Item Evidence linking and version stamping
