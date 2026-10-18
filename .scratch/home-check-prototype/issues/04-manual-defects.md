# 04: Manual Defects

**What to build:** On an Item, the Inspector adds a Defect by picking a Defect Category then a Defect Type from the Defect Dictionary, with the Item's relevant Categories first. They add a note and link any of the Item's photos. An Item can't have two Defects with the same Defect Type. The Dictionary is bundled, versioned reference data, loaded exactly as in the blueprint (Appendix C merges are pending approval). See the spec: Domain rules, Reference data.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Defect Dictionary loads as versioned reference data; replacing it needs no code change
- [x] Picker: Defect Category then Defect Type; Item's relevant Categories first; all Categories reachable
- [x] Only Defect Types in the bundled Dictionary can be recorded; Other / Unknown available with a note
- [x] Adding a second Defect with the same Defect Type on the same Item is refused and opens the existing Defect
- [x] Defect records Defect Type code, Dictionary version, source "manual", note and linked Evidence
- [x] A Defect can link only photos of its own Item; one photo can link to several Defects
- [x] Edit note and links, or remove the Defect (the "only while Draft" check is deferred to 06)
- [x] Area and Item views show Defect counts per Item
- [x] Core tests cover the one-per-Defect-Type rule, Dictionary-only codes, same-Item Evidence linking and version stamping

## Comments

- The Dictionary is `src/referenceData/defect-dictionary.json` (version `master-v1`), generated from the blueprint's "Master Home Check Defect Label Dictionary V1": 28 Categories, 382 Defect Types. Appendix C merges are not applied.
- "Other / Unknown with a note" is data, not code: a Category can set `noteRequired: true` (only `OT` does). Adding or editing a Defect of such a Category without a note is refused (`note-required`).
- The core checks at start-up that Defect Category and Defect Type codes are unique and that every Item Catalog Category exists in the Dictionary.
- Removing an Item that has Defects is refused (`item-has-defects`), like `item-has-evidence`.
- Deleting a photo unlinks it from every Defect of its Item first; the Defects stay.
- A Defect whose code is missing from the bundled Dictionary (recorded under an older version) shows its code as its name.
