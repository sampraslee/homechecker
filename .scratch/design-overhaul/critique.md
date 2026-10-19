# Design critique: Home Check at phone width

Status: needs-triage

## Context

- **Reviewed:** the live production build, 2026-10-19, at 375×812, on branch `design-overhaul`.
- **Screens:** Inspections list, Start Inspection (Move-in and Move-out), Inspection (Draft and Completed), Area, Add Area, Add Item, Item, Add note, the Add Defect picker (all 3 steps), and Settings.
- **Reviewed from the code only:** photos, the photo viewer and AI Suggestions. Those states need a camera, and the online AI. Findings from the code are marked _(code)_.
- **User:** an Inspector on site, in bright rooms, often using one hand, often offline. They do the same capture loop dozens of times per Unit. This is a _transient, repetitive_ posture: obvious controls, few decisions, fast in and out.
- **Brand:** main `#00A3FF`, accent `#1CA3B8`. There's no design system, and dark mode is not a priority.
- **Fidelity:** live product. Every heuristic applies.

## First impression (5-second scan)

- **What is each screen about?** The list is clear. The Inspection, Area and Item screens look almost identical: white cards on grey, with a dark blue button. You learn where you are from the title text, not from the screen.
- **Primary action:** obvious on the list (Start Inspection) and on an empty Area (Add Item). On the Item screen, two or three filled buttons compete.
- **Anything confusing?** Item and Defect screens don't say which Area they belong to. Defect codes (`SN-BASIN-CRACK`) appear everywhere.

Overall: **mostly clear**. The flows work; the problems are hierarchy, orientation and legibility in glare.

## Contrast check

| Pair | Ratio | Needs | Verdict |
|---|---|---|---|
| `#00A3FF` (brand) with white text | 2.73 | 4.5 | Fails for any text |
| `#1CA3B8` (accent) with white text | 3.01 | 4.5 (3 for large) | Large text only |
| `#00A3FF` with near-black text `#1b1f24` | 6.06 | 4.5 | Passes |
| Current `--brand` `#1f5f8b` with white | 6.84 | 4.5 | Passes, but off-brand |
| Border `#d9dee5` on white card | 1.35 | 3 (non-text) | Fails |
| White card on background `#f6f7f9` | 1.07 | 3 (non-text) | Fails |
| Muted text `#5f6b7a` on background | 5.06 | 4.5 | Passes |

## Findings

Severity: 4 means users can't finish the task, 3 is major, 2 minor, 1 cosmetic.

### 1. The brand colours can't carry text, and the app doesn't use them anyway (3)

**Principle:** WCAG 1.4.3 contrast; brand consistency. **Where:** every primary button and link.

Both brand blues are light and bright, so white button labels on them fail (2.73 and 3.01). The app sidesteps this with an unrelated dark blue, `#1f5f8b`, which is also its `theme-color` and PWA manifest colour. The result is legible but not Rizurf.

**Recommendation:** build a palette from the brand. Use a deep shade of `#00A3FF` (about 4.5:1 or better with white) for buttons, links and focus. Use pure `#00A3FF` and `#1CA3B8` only behind dark text, or as accents (selected states, progress, the AI marker). Update `theme-color` and the manifest to match.

### 2. Cards and inputs lose their edges in glare (3)

**Principle:** WCAG 1.4.11 non-text contrast; Law of Common Region. **Where:** every card, input, segmented control and the status bar.

White cards sit on a nearly white background (1.07:1) with a 1.35:1 border. On a phone in a sunny room, cards, input boxes and the Move-in/Move-out switch blur into the page. The Inspector can't see what's grouped, or where to tap.

**Recommendation:** darken borders to 3:1 or better, or use a clearly tinted background, or both. Give inputs a stronger border than cards.

### 3. The Defect picker shows the wrong Defect Types first and takes three steps (3)

**Principle:** Hick's Law; serial position; excise. **Where:** Item → Add Defect.

For a Basin, Sanitary Fittings opens with Toilet Bowl Loose, Toilet Bowl Cracked, Toilet Seat Broken and Toilet Seat Loose. The one that fits, Basin Cracked, is fifth and at the bottom edge of the screen. Each Type also shows its code at nearly the same weight as its name. After picking, a third panel asks for an optional note and linked Evidence. Its Add Defect button starts below the fold, behind the status bar.

**Recommendation (visual):** drop the codes from the picker, or shrink and lighten them a lot. Make each Type row a full-width, clearly separated tap target. Scroll the panel into view when it opens. The ordering itself is flow candidate A.

### 4. The Item screen doesn't say which Area it's in (3)

**Principle:** H1 visibility; H6 recognition over recall; navigation orientation. **Where:** Item screen, and Area screen.

The title is "Basin" and the back link is "‹ Area". In a Unit with a Master Bathroom, a Common Bathroom and a Powder Room, every Basin screen looks the same. The Inspector has to remember where they came from. The Area screen's back link likewise says "‹ Inspection", not the address.

**Recommendation:** name the parent in the back link ("‹ Powder Room"), and add a small context line above the title ("Powder Room · A-12-3 Residensi Harmoni"). This is a label change; the navigation stays the same.

### 5. "Saved on device" reassures, while Settings says the data may be cleared (3)

**Principle:** H1 visibility of system status; responsible writing. **Where:** the status bar on every screen; Settings → Storage on this phone.

On this browser, Settings says "Not kept: the browser may clear Inspections if the phone runs low on space." Meanwhile the status bar on every screen says "Saved on device". The only place that tells the truth is a screen Inspectors rarely open. The red "Never exported" badges help, but don't explain the risk.

**Recommendation:** make the status bar reflect storage: "Saved on device" when storage is kept, and "Saved on this phone only, export soon" (with a warning colour) when it isn't.

### 6. Too many filled buttons; the one that locks the record looks routine (2)

**Principle:** visual hierarchy; Von Restorff; H5 error prevention. **Where:** Item screen; Inspection screen.

With the note form open, the Item screen shows three filled primaries at once: Take photo, Save note and Add Defect. On the Inspection screen, Complete Inspection and Export are identical outline buttons. Completing locks the record for good; exporting is routine and safe.

**Recommendation:** one filled primary per screen (Take photo on an Item, Add Area on a Draft). Make Add Defect secondary. Give Complete Inspection its own deliberate style, separated from Export, since it is the one action that can't be undone.

### 7. The status bar takes the best thumb space and says little (2)

**Principle:** H1; Fitts's Law; selective attention. **Where:** the bottom of every screen.

It's 13.6px grey text in the easiest strip to reach. "Waiting for AI: 0 photos" looks the same as "Waiting for AI: 30 photos", and the same online as offline.

**Recommendation:** hide the AI count at 0. Show a clear state when photos are queued and when the phone is offline. Combine this with finding 5. Moving the screen's main action down here is flow candidate F.

### 8. Rows have three tap targets side by side, and Areas and Items behave differently (2)

**Principle:** Fitts's Law; H4 consistency. **Where:** Area screen (Items); Inspection screen (Areas).

An Item row is "Basin ›" text, with Rename and red Remove links in the same row. An Area row is a whole card with an Item count and no inline actions. Removing is safe, because the app refuses to remove an Area or Item that has anything in it. Still, a thumb aiming for the Item can hit Rename or Remove.

**Recommendation:** make every row a whole-card tap target, styled the same for Areas and Items, with a count ("3 photos · 1 Defect"). Where Rename and Remove go is flow candidate D.

### 9. An empty Inspection can be completed (2)

**Principle:** H5 error prevention. **Where:** Inspection → Complete Inspection.

The sample Completed Move-in has no Areas, and is now locked for good. The confirmation step does say "0 Areas, 0 Items recorded", but as plain text, with nothing to mark an empty Inspection as unusual.

**Recommendation (copy):** add Defects and photos to the counts ("2 Areas, 14 Items, 6 Defects, 31 photos"), and highlight any count that is zero. Blocking or warning on an empty Inspection is flow candidate E.

### 10. "Area / Taman" clashes with Area (2)

**Principle:** H2 match to the real world; H4 consistency. **Where:** Start Inspection, the address form.

In this app, an Area is a room, which is a core term. The address form uses "Area / Taman" for the neighbourhood.

**Recommendation:** label it "Taman / neighbourhood (optional)".

### 11. Defect codes and "0 linked" are jargon on screen (2)

**Principle:** H2; H8 minimalist design. **Where:** the Defect picker, Defect cards and the Defect confirmation step.

Codes like `SN-BASIN-CRACK` matter in the export, not to the Inspector on site. "0 linked" on a Defect card doesn't say what is linked.

**Recommendation:** hide codes in the capture UI, but keep them in the export. Replace "0 linked" with "No photos linked" or "2 photos".

### 12. Every screen looks the same (2)

**Principle:** orientation; aesthetic-usability. **Where:** everywhere.

The system font, one card style and one button colour make the list, Inspection, Area and Item screens interchangeable. The app has no visual identity.

**Recommendation:** use one brand typeface, stored in the app because it works offline, with a clearer type scale. Give each level a distinct header treatment: the Inspection shows the address, an Area its name with progress, an Item its Area as context.

### 13. One pill shape means five different things (2)

**Principle:** Law of Similarity. **Where:** badges.

The same pill is used for Draft/Completed (state), Never exported (a warning), AI-suggested (source), confidence and review outcome _(code)_.

**Recommendation:** keep pills for Inspection state only. Show the export warning as a warning row. Show AI source with a small consistent marker, and confidence as plain text.

### 14. AI Suggestions sit last, with three identical buttons (2, code)

**Principle:** visual hierarchy; serial position. **Where:** Item screen, AI Suggestions.

The section comes after Defects, below the fold once there are photos. Confirm, Correct and Reject are three identical secondary buttons. These are the three outcomes the prototype is measuring.

**Recommendation (visual):** make Confirm the clear choice, Correct secondary and Reject quiet. Moving the section up is flow candidate C.

### 15. Empty states describe instead of guide (1)

**Principle:** blank slate pattern. **Where:** "No Areas yet.", "No Items yet.", "No photos, videos or notes yet.", "No Defects recorded."

**Recommendation:** say what to do next. For example: "Add the rooms you'll inspect, starting from the front door."

### 16. Small visual inconsistencies (1)

- The focus ring is amber, which is off-brand. Use the brand focus colour.
- Add Item asks for the optional short name before you choose the Item. Choose first, then offer the name.
- The Move-out picker leads with the date. The Inspector knows the address, so lead with that.

## What's working well

- **Removing is safe.** Areas and Items can only be removed once they're empty, and deleting Evidence and completing an Inspection both have an inline confirmation step.
- **"Usual in Powder Room" and "Usual for Basin"** put likely choices first. That's the right idea; it just needs applying down to the Defect Type level.
- **Tap targets are mostly 44px or more**, and inputs are full width.
- **The Move-out copy** clearly explains what is and isn't copied from the Move-in.
- **There is always a way back,** and the app works offline.

## Flow candidates (need your approval; not part of the visual pass)

- **A. Narrow Defect Types to the Item.** Show Basin Types first, or only Basin Types, with "Other Types" behind a link. This partly depends on the Item Catalog reference data.
  **Decision (2026-10-19): approved, matched by name.** In each Defect Category, the Defect Types whose names start with the Item's name come first, and all the other Defect Types stay below. There are no Item Catalog changes.
- **B. Two steps for a Defect, not three.** Picking a Type adds the Defect straight away, and a note and linked photos can be added afterwards on the Defect.
  **Decision (2026-10-19): approved, with Undo.** Selecting a Defect Type adds the Defect at once, and a short "Added Basin Cracked. Undo" message lets the Inspector take it back. The note and Linked Evidence move to the existing edit form, opened by tapping the Defect card.
- **C. Move AI Suggestions up,** next to the photos they came from and above Defects, so review happens straight after capture.
  **Decision (2026-10-19): approved.** The Item screen order becomes Evidence, AI Suggestions, Defects. The AI Suggestions section still shows only once the Item has a photo.
- **D. Put Rename and Remove behind an Edit mode** on the Area and Inspection screens, so each row has one tap target.
  **Decision (2026-10-19): approved, as an Edit button on the Area screen.** Item rows have one tap target. Rename and Remove for each Item show only after the Inspector taps Edit. The Area's own Rename and Remove, now in its header, also show only in Edit mode.
- **E. Warn when completing an Inspection with no Areas or no Evidence.**
  **Decision (2026-10-19): approved, stop and warn.** An Inspection with no Areas can't be completed. One with no Evidence shows a warning in the confirmation step, but can still be completed. One with no Defects completes as normal.
- **F. Anchor each screen's main action at the bottom,** within thumb reach, with the status bar folded into it. The steps stay the same; only the position changes.
  **Decision (2026-10-19): approved.** Each screen gets one main button, fixed at the bottom: Start Inspection, Add Area, Add Item, or Take photo. A thin status line sits just above it. The list gets bottom padding so nothing is hidden, and the bar hides while the keyboard is open.

## Suggested next step

Settle the flow candidates. Then set a visual direction: palette (finding 1), structure contrast (2), type and identity (12). Start with the Item screen, since it has the most findings and is used the most.
