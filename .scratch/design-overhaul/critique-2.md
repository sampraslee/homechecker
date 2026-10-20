# Design critique 2: Home Check after the rebuild

Status: needs-triage

## Context

- **Reviewed:** a local production build of `main` at `0c9fd3a`, 2026-10-20, at 375×812.
- **Walked:** Inspections list (empty and with one Draft), Start Inspection (name gate and Move-in form), Inspection (Draft, Complete confirmation), Add Area, Area (normal and Edit mode), Add Item, Item, Add note, Add Defect (categories, Types, Undo), Defect editor with Linked Evidence, and Settings.
- **Not covered:** photos, video, the photo viewer, AI Suggestions, Move-out and a Completed Inspection. They need a camera, the online AI or more set-up. Findings from the code are marked _(code)_.
- **Compared with:** [critique.md](critique.md), from 2026-10-19.

## Overall impression

The rebuild worked. Screens now have a clear identity (dark band, teal accents), one main action sits in thumb reach on every screen, every row is one tap target, and every text and edge pair passes contrast. What's left is smaller: one status message that briefly lies, a few places where the visual weight is in the wrong spot, and the Defect picker, which is still the slowest part of the loop.

## Usability

| Finding | Severity | Recommendation |
|---|---|---|
| **1. The storage status says "Saved on this phone" (green) for a moment on every screen, then switches to "Not kept on this phone: export soon".** `Dock` starts with no storage answer and treats that as kept ([Dock.tsx:55](../../src/ui/Dock.tsx)). Each new screen mounts its own Dock and asks again. Because the line is `role="status"`, a screen reader may also announce the change on every screen. | 🟡 Moderate | Show nothing until the answer is known, and keep the answer in the shared context so it is read once, not per screen. |
| **2. On the Inspection screen, Complete Inspection is the heaviest thing on the screen.** It's a black filled button (17.9:1), heavier than the teal Add Area in the Dock, and it shows even on an empty Inspection that can't be completed. The action that can't be undone draws the eye before the one the Inspector needs next. | 🟡 Moderate | Make the first Complete Inspection button an outline or quiet button. Keep the black only for the final **Complete** in the confirmation step, where it belongs. |
| **3. The Defect picker opens mostly below the fold, under the Dock.** After Add Defect, only the first two category chips show. Take photo and Done stay in the Dock and cover about 125px. Add Area and Add Item hide the Dock's button while their panel is open, so the screens behave differently. | 🟡 Moderate | While the picker is open, hide the Dock's buttons as Add Area and Add Item do, and scroll the panel's heading to the top. |
| **4. The Basin's crack lives somewhere the Inspector won't look first.** The Inspector thinks "crack". "Crack / Separation / Deformation" is under _All other Categories_, but Basin Cracked is under Sanitary Fittings. _All other_ is 24 more chips. Ordering Types by Item name (flow A) helps only after the right category is chosen. | 🟡 Moderate | See flow candidate G. |
| **5. Linked Evidence doesn't look tappable until it's tapped.** Before linking, the note in the Defect editor looks exactly like the note card above it. The "✓ Linked" state afterwards is clear. | 🟡 Moderate | Give unlinked Evidence an empty check circle, or a "Tap to link" hint, so both states read as a toggle. |
| **6. The Defect editor repeats the card it came from.** Tapping the Basin Cracked card leaves the card in place and opens a second card below it, with the same title and category and a large gap between them. | 🟢 Minor | Open the editor in place of the card, so there's one Basin Cracked on screen. |
| **7. Add Item still asks for the optional short name before you choose the Item** (old finding 16). Most Items don't need one, but the empty field comes first. | 🟢 Minor | See flow candidate H. |
| **8. Settings says storage isn't kept, but not what to do about it.** | 🟢 Minor | Add the fix in a line, such as "Add Home Check to your home screen so the phone keeps it", if that is true for the target browsers. |

## Visual hierarchy

- **What draws the eye first:** the band's white title, then the Dock's teal button. That's right on the list, Area and Item screens. On the Inspection screen the black Complete Inspection pulls attention instead (finding 2).
- **Reading flow:** band → content → Dock is consistent on every screen, and the back link names the parent ("‹ Master Bathroom"), which fixes old finding 4.
- **Emphasis:**
  - **The Inspection title is the least useful fact.** The h1 is "Move-in"; the Unit is a small mono line above it and then repeated in full in the Unit row below. Make the Unit (`A-12-3`) the h1, with "Move-in · Residensi Harmoni" as the line above, and drop the repeat.
  - **List cards are tall.** The full address is 3 lines of bold, so one card is 159px. Bold the Unit and building, put the street and city in muted text, and add progress ("3 Areas · 5 Defects").
  - **Area rows show less than Item rows.** An Area says "1 Item"; an Item says "1 note, 1 Defect". Add Defects to Area rows, so progress shows one level up.

## Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Warning colour | On the list, one Draft shows three amber things: the Draft pill, "Not exported yet: only on this phone" and the Dock's "Not kept on this phone: export soon". The last two sound like they disagree. | Make the Draft pill neutral or teal. Keep amber for real risk. Say it one way: "Not exported" on the card, "This phone may clear Inspections: export soon" in the Dock. |
| Pills _(code)_ | Draft and Unreviewed use the same style; Completed and Confirmed use the same style ([styles.css:131](../../src/ui/styles.css)). Old finding 13 is only partly done. | Keep pills for Inspection state only. Show review outcome as text with an icon. |
| Dock while a panel is open | Hidden for Add Area, Add Item and Edit mode; shown for Add Defect and the Defect editor. | One rule: a panel that takes over the screen hides the Dock's buttons (finding 3). |
| "Done" | On the Item screen, Done leaves the Item. In Area Edit mode, Done leaves Edit mode. Same word, same pill-ish look, different scope. | Fine for now; consider "Finish editing" in Edit mode if testers confuse them. |

## Accessibility

- **Colour contrast:** everything checked passes AA.

  | Pair | Ratio |
  |---|---|
  | White on `--teal-deep` (buttons) | 5.85 |
  | `--teal-deep` links on white | 5.85 |
  | `--warn` on page | 6.78 |
  | `--warn` on `--warn-tint` (Draft pill) | 6.37 |
  | `--danger` on page | 6.18 |
  | `--ink-muted` on page | 7.24 |
  | `--mint` eyebrow on `--night` | 6.33 |
  | `--on-night-muted` back link on `--night` | 12.84 |
  | `--line` card and input edges on page | 3.11 (needs 3) |
  | Placeholder `#757575` on white | 4.61 |

  The count tiles in the Complete confirmation have a 1.23:1 border, but they are not controls, so this is fine.
- **Touch targets:** every button measured is 43px tall or more and full width where it matters. The category chips (43px) and Edit and Settings pills (43px) are just under Apple's 44pt, and well over the WCAG 2.2 minimum of 24px. Text links such as Cancel (52×47) and ‹ Categories (94×47) are fine.
- **Text readability:** body text is 16px or more. The status line is 13.6px bold; it's the smallest text that matters, so consider 15px.
- **Names:** inputs are wrapped in their labels, and icon-only rows have `aria-label`s ("Edit note: …", "Link note: …", with `aria-pressed`). Finding 1 is the one screen-reader issue.

## What works well

- **One main action, always in thumb reach.** Start Inspection, Add Area, Add Item and Take photo with Done all sit in the Dock, and it gets out of the way while you type.
- **Orientation is fixed.** The back link names the parent, and the mono address line on every screen says which Unit you're in.
- **Adding a Defect is one tap with Undo.** "Added Basin Cracked. Undo" is fast, and it waits while you interact with it.
- **The Complete confirmation is honest.** Count tiles for Areas, Items, Evidence and Defects, and copy that says exactly what locking means.
- **Edit mode** removes the stray Rename and Remove taps, and the empty states now say what to do next.
- **Glare.** Edges at 3.11:1 and the dark band make the structure visible in a bright room.

## Priority recommendations

1. **Stop the storage status from saying "Saved" first** (finding 1). It's small to fix, and it's the one place the app tells the Inspector something false about their data.
2. **Make the Defect picker land in view and get the Dock out of its way** (finding 3), and make Linked Evidence look like a toggle (finding 5). These are on the path the Inspector repeats most.
3. **Move the weight on the Inspection screen** (finding 2, plus the title and warning-colour fixes). Put the Unit in the title, make Complete Inspection quiet until the confirmation, and keep amber for real risk.

## Flow candidates (need your approval; not part of the visual fixes)

- **G. Find a Defect Type without choosing a category first.** At the top of Add Defect, show the Item's own Types ("Basin Cracked", "Basin Loose") as one-tap rows, above the categories. Or add a search box that matches Type names across every category. Either way the Basin's crack is one tap, not a guess about which category holds it.
- **H. Choose the Item, then offer the short name.** In Add Item, tapping an Item adds it straight away, as Areas already do. The short name moves to Rename, or to a "Name this one" prompt shown only when the Area already has that Item.
