# Spec: Inspection UX refresh

Status: ready-for-agent

Source: a design brief from the product owner and the Airbnb-style reference screenshot (cards with a photo on top, underlined category tabs), settled in a grilling session. Use glossary terms throughout (`GLOSSARY.md`: Inspection, Unit, Area, Item, Defect, Completed Area, AI Suggestion). Builds on `.scratch/guided-defect-recording/`.

## Problem Statement

The Inspections list mixes Move-ins and Move-outs and says little about each Inspection. The Move-in / Move-out screen ends in a "Finish" section where Export, Complete and Delete sit together, and Export works on Drafts, so a half-recorded Inspection looks as final as a finished one. AI Suggestions are listed on the Inspection, away from the Items they belong to. There is no way to say an Area has been fully inspected. Adding an Area and an Item takes steps that don't always need asking.

## Solution

### Inspections list
- Two tabs, **Move-ins** and **Move-outs**, underlined like the reference. Newest first by date started.
- Each Inspection is a card: status (Draft or Completed), a gray box standing in for a photo of the building (no capture or storage yet), Unit number, building name (the street when the Unit has none), inspection date, total Defects, and a `More info` link. The whole card is tappable and goes to the Move-in / Move-out screen. City, postcode and the "Exported …" line leave the card. A Completed Inspection never exported keeps a small "Only on this phone" nudge.
- A small button at the bottom right starts an Inspection of the active tab's type ("New Move-in" / "New Move-out"). The Move-in or Move-out choice screen goes away.

### Move-in / Move-out screen
- The **Finish** section is removed. Two buttons replace it: `Complete Inspection` and `Delete Inspection`. Delete works as it does today.
- The AI Suggestions list is removed from this screen.
- `Complete Inspection` opens its own page, **Complete this Inspection**:
  - shows what will be locked: Areas, Items, Evidence, Defects;
  - lists warnings that do not block: Areas not Completed, Defects with no Severity, unreviewed AI Suggestions, AI still working. Only "no Areas" blocks;
  - has a `Complete` button; on success the same page shows the Completed state with `Export now`.
  Back before completing changes nothing.
- Export exists only for a Completed Inspection. On a Completed Inspection the `Complete Inspection` button becomes `Export`. A Draft cannot be exported.

### Add Area
Step 2, `Name it`, appears only when the Inspector picked "Not in the list", or picked a standard Area whose name the Inspection already has (a second bathroom). There it is prefilled with the next free name ("Common Bathroom 2") for the Inspector to keep or change. Any other standard Area is added at once under its standard name and can be renamed later.

### Add Item and Record a Defect
- When the Inspector adds a **new** Item, `Add Item` is step 1 of Record a Defect, so the flow has three steps. Recording a Defect on an existing Item skips it and keeps its two steps (Evidence, then Defect Types).
- The Item is created when its first piece of Evidence is saved. Quitting before that leaves nothing behind.
- "All other Items" starts collapsed.
- In step 2, once a Severity is chosen, `Next` becomes `Done` on the last piece of Evidence. Earlier pieces keep "Next Evidence". `Done` returns to the Item screen with a short "Defect saved" toast. The Saved screen is removed.

### Item screen
The bottom bar goes. `Back` stays. Photo, Video and Note capture buttons move into the Evidence and Defects section, beside `Record a Defect` (Evidence with no Defect is still allowed, ADR 0006).

### Completed Area
- The Area screen's bottom bar becomes `Add Item` and `Complete`. `Complete` marks the Area as a Completed Area, including one with no Items.
- Adding to or changing a Completed Area (Item, Evidence, Defect, note, deletion) makes it no longer Completed. It is never locked.
- Shown on the Area card, in the Area header, and as "x of y Areas Completed" on the Move-in / Move-out screen.
- A new Move-out copies Areas and Items from its Move-in but every Area starts not Completed.
- Completing the Inspection freezes the marks with everything else.
- ADR 0003 is amended: a Completed Area says "looked at", not "no Defects".

### AI Suggestions
- Reviewed on the Item, as today.
- Item cards and Area cards show an "n to review" badge so the Inspector can find them.
- Rejecting a suggestion hides it from the Item at once; the record stays with Outcome "Rejected" so Export's AI Suggestions sheet still shows it.

## Out of scope
Capturing a building photo, a bottom tab bar, search or filters on the list, drafts export, reopening a Completed Inspection.

## Decisions already recorded
`GLOSSARY.md` (Completed Area, AI Suggestion) and ADR 0003's amendment were written while grilling.
