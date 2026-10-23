# Spec: Short address and step footers

Status: ready-for-agent

Source: UI/UX improvements from the product owner, settled in a grilling session. Builds on `.scratch/inspection-ux-polish/` (the `StepFooter`, `StepBar` and one-page address form it introduced). Use glossary terms throughout (`GLOSSARY.md`: Inspection, Unit, Area, Item, Defect).

## Problem Statement

Inspectors only inspect Units the company manages, so they already know where the Unit is. Asking for street, locality, postcode, city and state is busywork, and the long address clutters every screen that shows it.

Only Record a Defect has the new footer (an underlined `Back` on the left, a dark button on the right). The Area, Item, Add Area and Inspection screens still use the older footer: a single icon-and-label button, a lone `Back`, or two buttons side by side. The app has two footer styles, and several screens give the Inspector no `Back` in thumb reach.

## Solution

A Unit is identified by its unit number and building name, and nothing else. The Start Inspection form has two fields. The short form ("A-12-3, Residensi Harmoni") shows everywhere an address showed.

The Area, Item, Add Area and Inspection screens use the new footer: `Back` on the left, the screen's main action on the right. The Inspections list keeps its floating button.

## User Stories

### Address

1. As an Inspector, I want the Start Inspection form to ask only for Unit number and Building name, so that starting an Inspection takes seconds.
2. As an Inspector, I want both fields required, so that every Inspection says which Unit and building it covers.
3. As an Inspector, I want one button reading "Save address", so that the form is as before, only shorter.
4. As an Inspector, I want earlier Units on this phone suggested as I type a unit number or building name, so that I don't retype a building I've already entered.
5. As an Inspector, I want picking a suggestion to fill both fields, so that one tap completes the form.
6. As an Inspector, I want the Move-out screen's link to read "Type the unit instead", so that it matches the shorter form.
7. As an Inspector, I want the Unit shown as "A-12-3, Residensi Harmoni" in the header, the Add Area header, the Complete screen and the export, so that every screen says it the same way.
8. As an Inspector, I want the export file name to use the type, unit number, building name and start date, so that exports of different Units don't collide.

### Footers

9. As an Inspector, I want the Area screen's footer to read `Back` and `Add Item`, so that I can leave the Area or add to it from the same place.
10. As an Inspector, I want `Complete` under the Items list, so that marking an Area inspected sits with its Items and not with navigation.
11. As an Inspector, I want `Complete` to still toggle to "Completed", so that the mark can still be taken off.
12. As an Inspector, I want the Item screen's footer to read `Back` and `Record a Defect`, so that recording a Defect is one thumb tap away.
13. As an Inspector, I want the in-page Record a Defect button removed, so that the screen doesn't offer the same action twice.
14. As an Inspector, I want the Add Area flow to have `Back` on both steps, so that I can leave the flow from step one too.
15. As an Inspector, I want the Add Area flow's progress bar above its footer, so that it matches Record a Defect.
16. As an Inspector, I want the Add Area flow's right button to read `Next` when another step follows and `Add Area` when it saves, so that I know when tapping it creates the Area.
17. As an Inspector, I want the Inspection screen's footer to read `Back` and `Add Area`, so that `Back` returns me to the Inspections list.
18. As an Inspector, I want the Inspections list footer unchanged, so that its floating button still sits over the cards.
19. As an Inspector, I want the right button hidden where the action isn't allowed (a Completed Inspection, an Area being edited, an Inspection being deleted) while `Back` stays, so that I can always leave.
20. As an Inspector, I want the "Defect saved" message and its Undo to keep showing above the Item screen's footer, so that undoing works as before.

## Implementation Decisions

### Address

- `UnitAddress` is `unitNumber` and `buildingName`, both required strings. Street, locality, postcode, city, state and `MALAYSIAN_STATES` are removed from the model, the form, validation, sample data and test fixtures.
- No migration. No Inspections exist yet outside development.
- Validation errors: "Unit number is required" and "Building name is required".
- One formatter: `formatAddress` returns `"<unit>, <building>"`. `shortAddress` merges into it.
- `unitHeading` loses its street fallback, since the building name is required.
- Suggestions match on unit number and building name (`SUGGESTING_ADDRESS_FIELDS`). Duplicate Units are collapsed as now, on case- and spacing-insensitive unit and building.
- The export file name is `home-check-<type>-<unit>-<building>-<date>.zip`, each slugged.
- The Move-out link reads "Type the unit instead".

### Footers

- `StepFooter` gets a `nextLabel` prop (default "Next") and an optional `onBack`; when `onNext` is absent the right button isn't drawn. Record a Defect is unchanged.
- Area screen: footer `Back` and `Add Item`. No progress bar. `Complete` (still toggling, still `aria-pressed`) moves under the Items list. Both show only when the Area is editable and not being edited.
- Item screen: footer `Back` and `Record a Defect`. The in-page button is removed. The toast stays in the Dock's message slot. On a locked Inspection the footer is `Back` alone.
- Add Area flow: `StepFooter` with the progress bar as the Dock's message. Back on step one calls `onCancel`; on step two it goes to step one. The right button reads `Next` or `Add Area`. The old header bar is dropped.
- Inspection screen: footer `Back` (to the Inspections list) and `Add Area`. Locked, adding and confirming-delete states show `Back` alone.
- `Back` on every screen goes where the Band's back link goes. The phone's back gesture is unchanged.
- Inspections list, Complete, Settings and the "not found" states are unchanged.

## Testing Decisions

Test what an Inspector can observe, not the markup.

- **Core service.** `startMoveIn`, `startMoveOut`, suggestions, validation, the export file name and the export address line are tested through the existing core tests (`src/core/inspections.test.ts`, `src/core/addressSuggestions.test.ts`, `src/core/export.test.ts`, `src/core/moveOut.test.ts`). Update fixtures first.
- **Pure helpers.** `unitHeading` and `formatAddress` keep their tests, updated for two fields.
- **Footers (visual).** Layout and footer states are checked in the browser preview at phone width. Not unit tested.

## Out of Scope

- Changing the Inspections list footer, the Complete Inspection screen, Settings or the Inspector name form.
- Adding a progress bar to the Area, Item or Inspection screens.
- Migrating stored addresses, or showing street data anywhere.
- Any change to what `Complete` does on an Area.

## Further Notes

- **Glossary.** Update **Unit** to "identified by its unit number and building name". No other term changes.
- **Flow changes.** The Area's `Complete` moving under the Items list, and the Item screen's Record a Defect moving into the footer, are flow changes approved by the product owner in the grilling session.
