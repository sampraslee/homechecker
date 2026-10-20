# FP-03: Back from the address goes to the Move-in / Move-out screen

Status: built, uncommitted on design/ux-changes (approved with changes)

Flow changed: F-02 Start Move-in, F-03 Start Move-out (linked), F-04 Start Move-out (unlinked). Screen: S-02 `StartInspectionScreen.tsx`.

Issue: UX-008 in `issue-log.md`.

Approved with changes on 2026-10-20; see "Decisions so far".

## Before (today, after FP-01)

1. Start Inspection opens the Move-in / Move-out screen.
2. Picking one goes to the next screen: the address groups for Move-in or unlinked Move-out, or the Move-in picker for a Move-out.
3. On any of those screens, the Band back ("‹ Inspections") and the phone's back gesture both go to the Inspections list.
4. There is no way back to the Move-in / Move-out screen. A wrong choice means leaving and starting again, which also loses the typed address.

## After (proposed)

The Move-in / Move-out screen becomes the screen "above" the rest of Start Inspection.

| Where the Inspector is | Band back | Phone back gesture | Dock Back |
|---|---|---|---|
| Move-in / Move-out screen | Inspections list (unchanged) | Inspections list (unchanged) | none |
| Move-in picker (Move-out) | Move-in / Move-out screen, labelled "‹ Type" | Move-in / Move-out screen | none |
| Address group 1 | Move-in / Move-out screen, labelled "‹ Type" | Move-in / Move-out screen | none (as today) |
| Address groups 2, 3 and Review | Move-in / Move-out screen, labelled "‹ Type" | Previous group | Previous group (as today) |

- The phone back gesture uses the app's existing panel history (`useBackCloses`), the same way panels close today. So back steps through the address groups one at a time, then to the Move-in / Move-out screen, then to the list.
- The Band back is the "up" control: it always goes to the Move-in / Move-out screen from inside Start Inspection.

## Constraints (do not change)

- FP-01's three address groups and the Review step.
- The Move-in / Move-out screen stays its own first screen (FP-01 prototype, variant B).
- Offline, address validation and suggestions unchanged.
- The Inspector name prompt still comes first if no name is set.

## Trade-off

- **Primary goal (time per Inspection):** no extra taps on the normal path. A wrong type costs one tap to fix instead of a restart.
- **Guardrail (mis-filed Defects):** fewer Inspections started with the wrong type and then abandoned or left wrong.
- **Risk:** two back controls on the address screens (Band back and Dock Back) go to different places. The Band label "‹ Type" says where it goes.

## Open questions for approval

1. **Keep the typed address when the type changes?** I recommend yes when going back and picking the same type again, and also when switching between Move-in and unlinked Move-out, since both use the same address. A linked Move-out uses the Move-in's address, so nothing typed is needed there.
2. **Phone back gesture through the address groups:** step back one group at a time (recommended), or jump straight to the Move-in / Move-out screen?
3. **Band back label:** "‹ Type", "‹ Move-in or Move-out", or something else?

## Decisions so far

1. **Keep the typed address when the type changes:** approved.
2. **Phone back steps back one group at a time:** approved.
3. **Band back label:** "‹ Move-in or Move-out".

## Decision

- [ ] Approved as written
- [x] Approved with changes: the Band back label is "‹ Move-in or Move-out" (not "‹ Type")
- [ ] Rejected
