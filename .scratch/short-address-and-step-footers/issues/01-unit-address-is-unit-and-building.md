# 01: A Unit's address is its unit number and building name

**What to build:** Starting an Inspection asks only for Unit number and Building name, both required. Street, locality, postcode, city, state and `MALAYSIAN_STATES` are removed from the model, form, validation, sample data and fixtures. The Unit shows as "A-12-3, Residensi Harmoni" everywhere, including the export; the export file name uses the building name instead of the street; suggestions match on both fields. See the spec: Address.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The form has Unit number and Building name only, with a "Save address" button
- [x] Both are required; errors read "Unit number is required" and "Building name is required"
- [x] Picking a suggestion fills both fields; suggestions match on both
- [x] The Move-out link reads "Type the unit instead"
- [x] `formatAddress` returns `unit, building`; `shortAddress` and `unitHeading`'s street fallback are gone
- [x] The export address line and file name use unit and building
- [x] Sample data and test fixtures use two-field addresses; the core tests pass
- [x] GLOSSARY.md's Unit entry says it is identified by unit number and building name
