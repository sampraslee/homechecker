# Design critique 3: photos, AI Suggestions, Completed, Move-out and Delete

Status: needs-triage

## Context

- **Reviewed:** a local production build of `main` at `0c9fd3a`, 2026-10-20, at 375×812. This is the same build as [critique-2.md](critique-2.md), so its findings still stand. This pass covers what critique 2 left out.
- **Walked:** three photos on a Basin, the AI Suggestions they produced (Confirm with a required note, Confirm of a repeated Type, Correct, and the reviewed states), the photo viewer and Delete photo, Complete and the Completed screen, Start Move-out from a Move-in, a Move-out Item, and Delete Inspection.
- **Not covered:** video, and AI failure or offline states. Findings from the code are marked _(code)_.
- **Test data left behind:** the local Draft Move-in for A-12-3 is now Completed and has two test photos. I deleted the Move-out I created.

## Overall impression

The capture loop holds up once there are photos: "Photo saved", the AI count, and a Confirm that merges into an existing Defect all work well. The weak spots are what comes after: reviewed AI Suggestions pile up, deleting a photo quietly drops data, and a Move-out looks exactly like a Move-in once you're inside it.

## Usability

| Finding | Severity | Recommendation |
|---|---|---|
| **1. A Move-out looks exactly like a Move-in below the Inspection screen.** The Area and Item bands show only "A-12-3, Residensi Harmoni". If a Move-in and a Move-out for the same Unit are both on the phone, a Basin screen doesn't say which one you're recording into. On the Inspection screen, "Move-in: 20 Oct 2026, by Test Inspector" is plain text, not a link. | 🔴 Major | Add the kind to the band's eyebrow on every screen: "A-12-3 · Move-out". Make the Move-in row a link to the Move-in. Showing Move-in Defects on the Item is flow candidate J. |
| **2. Deleting a photo also deletes its AI Suggestion and its review outcome, without saying so.** The first photo was linked to a Defect and had a Confirmed AI Suggestion. After "Delete photo", the Defect drops to "Linked: 1 photo" and the Suggestion is gone from the list, so the export's AI results lose that review too. The confirmation only says "Keep photo / Delete photo". | 🔴 Major | Say what goes in the confirmation: "Linked to 1 Defect. Its AI Suggestion (Confirmed) is removed too." Warn more strongly when it's a Defect's only photo. Whether a review outcome should outlive its photo is a data decision, not a design one. |
| **3. The photo viewer crops every photo to a square.** A 4:3 photo loses about a quarter of its width, but the export and the AI get the full frame. The viewer is the only place the Inspector can check what a photo shows, so whatever is at the edges is never seen. Square photos were a deliberate choice (`af97437`). | 🔴 Major | Keep the square thumbnails, but show the full frame in the viewer (`object-fit: contain`). This reverses an earlier decision, so it's flow candidate I. |
| **4. Reviewed AI Suggestions stay full size and push Defects down.** After three photos, the reviewed cards take about 400px above Defects. The "Corrected to Basin Cracked" pill wraps to three lines and squeezes the title to three lines as well. | 🟡 Moderate | Collapse each reviewed Suggestion to one line, for example "✓ Further Inspection Required · Confirmed" or "→ Corrected to Basin Cracked", with the outcome as text. Keep only unreviewed Suggestions as full cards. |
| **5. Confirm, Correct and Reject have no Undo, but Add Defect does.** Reject is a quiet link right next to Correct. A wrong tap records a false outcome in the AI results, and nothing can take it back. | 🟡 Moderate | Use the same Dock message with Undo that Add Defect uses: "Rejected Further Inspection Required. Undo". |
| **6. Confirm and Correct open their panel below every Suggestion, not under the one you tapped.** Confirming the first Suggestion (whose Type needs a note) opened the note form after the third card. Once Correct's Type list scrolls into view, there's nothing on screen to show which photo is being corrected. | 🟡 Moderate | Open the panel inside the tapped card, or give it a header with the photo's thumbnail: "Correcting photo 3 · Further Inspection Required". |
| **7. The Dock grows to four layers.** Right after a photo: "Photo saved", then "Not kept on this phone: export soon", then "2 photos waiting for AI", then the buttons. That's about 205px, a quarter of the screen, and it covers the first AI Suggestion as it arrives. | 🟡 Moderate | Let the passing message replace the status lines while it shows, rather than stack on top of them. Put the storage and AI states on one line. |
| **8. The Completed screen opens with a warning, and its next step is below the fold.** Straight after a successful Complete, the band shows an amber box: "This Inspection is Completed, so it can't be changed." The tick and "Export now" come after the details and Areas, and the Dock has no button. | 🟡 Moderate | Make the locked note neutral, in the same style as the band's text. On a Completed Inspection that has never been exported, put Export now in the Dock, as the screen's one main action. |
| **9. The Complete confirmation doesn't mention unreviewed AI Suggestions.** The counts cover Areas, Items, Evidence and Defects only. Suggestions can still be reviewed after locking, but the Inspector is about to leave the Unit. | 🟢 Minor | Add "3 AI Suggestions not reviewed" under the count tiles when there are any. |
| **10. Tapping a Move-in starts the Move-out straight away.** The card looks like a list card that opens something. It has no chevron or button saying it starts a new Inspection, and the Dock is empty. | 🟢 Minor | Add "Start Move-out ›" to the card, or put Start Move-out in the Dock once a Move-in is chosen. |
| **11. In Delete Inspection, "Export it first" is text, not a button.** And after the delete, the list gives no sign that anything happened. | 🟢 Minor | Add an Export button in the confirmation. Show "Deleted Move-out for A-12-3" in the Dock on the list. |

## Visual hierarchy

- **Item screen with photos:** Evidence, then AI Suggestions, then Defects (flow C) reads well with one photo. By three photos, the AI section is the biggest thing on the screen, even once everything in it is reviewed (finding 4). Defects, the actual result, sit two screens down.
- **AI cards:** filled Confirm, outlined Correct and a text Reject now give a clear order (old finding 14 is fixed). The outlined Correct is tight, though: its border sits close to the text.
- **Completed:** the amber box in the band, the green Completed pill and the green tick compete. Keep one success signal: the tick.

## Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Undo | Add Defect has Undo; AI Confirm, Correct and Reject don't (finding 5). | Every action that creates or settles a Defect gets the same Undo message. |
| Outcome pills | "Confirmed" uses the same green pill as "Completed". "Corrected to …" is a pill with a sentence in it. | Same as critique 2: pills for Inspection state only. Show outcomes as text with an icon. |
| Dock button | The Item, Area, Draft and list screens each have one. Completed, Start Move-out (before you pick) and the Move-in picker have none. | Each of these has an obvious next action: Export now, or Start Move-out. |
| "From AI Suggestion" | Also shown on a Defect the Inspector corrected, meaning they chose the Type themselves. | "Corrected from AI Suggestion", or nothing. |

## Accessibility

- **Viewer controls:** Close, Delete, Keep photo and Delete photo are text links in a 48px bar, which is fine for size. But "Delete photo" appears in exactly the spot where "Delete" was, so a double tap deletes. Move the confirming button, or use a short delay before it can be tapped.
- **Focus:** the viewer moves focus to Close and returns it on close, and Escape and the back gesture both close it _(code)_.
- **Reduced motion** is honoured in `styles.css` _(code)_.
- **Screen readers:** the Dock's stacked status lines (finding 7) are all inside the status region, so one photo can trigger three announcements _(code, not tested with VoiceOver)_.

## What works well

- **A repeated Type merges cleanly.** Confirming a second "Further Inspection Required" added the photo to the existing Defect, and said so: "Photo added to the existing Further Inspection Required Defect."
- **Correct starts in the right place.** "Usual for Basin" comes first, and the Type list scrolls into view, which Add Defect still doesn't do (critique 2, finding 3).
- **Delete Inspection is a model confirmation.** It lists what goes, warns that this phone has the only copy, and labels the button "Delete without exporting".
- **Completing nudges export at the right moment:** "Export it now: until you do, it's only on this phone."
- **The Move-out copy** says exactly what is and isn't copied from the Move-in.

## Priority recommendations

1. **Show Move-out on every screen** (finding 1). It's a one-line change to the band, and it stops the Inspector recording into the wrong Inspection.
2. **Make deleting a photo honest** (finding 2), and give AI reviews Undo (finding 5). Both protect the data the prototype exists to measure.
3. **Collapse reviewed AI Suggestions and slim the Dock** (findings 4 and 7). These cost the most screen space on the screen used most.

## Done (2026-10-20)

- **Finding 1:** the Area and Item bands read "A-12-3, Residensi Harmoni · Move-out". The Move-in row as a link is not done.
- **Finding 2:** the photo delete confirmation now sits at the bottom of the viewer, away from Delete, and says what else goes: the Defects the photo comes off (or that it's a Defect's only Evidence) and its AI Suggestions with any reviews.
- **Finding 5:** Confirm, Correct and Reject each show Undo. Undo puts the Suggestion back to review and takes back exactly what the review changed (core `undoAiReview`).
- **Flow J:** built as decided. When the Move-in Item has no Defects, the line reads "No Defects recorded".

## Flow candidates (need your approval; not part of the visual fixes)

- **I. Show the full photo in the viewer.** Thumbnails stay square. The viewer shows the whole frame that is exported and sent to the AI. This reverses part of `af97437`.
  **Decision (2026-10-20): declined.** The viewer stays square, as decided in `af97437`. Finding 3 is closed.
- **J. Show the Move-in's Defects on a Move-out Item.** Show a short read-only line under Defects, for example "At Move-in: Basin Cracked (2 photos)", with a tap to see those photos. Nothing is copied into the Move-out, so the record stays factual, but the Inspector can tell what is new.
  **Decision (2026-10-20): approved, matched by name.** On a Move-out linked to a Move-in that's still on this phone, each Item shows a read-only "At Move-in: …" line under Defects. It lists the Defect Types recorded on the Move-in Item with the same Area name, Item name and short name. Tapping the line shows that Item's Move-in photos. Nothing is copied or pre-filled. When no Item matches, or the Move-in was deleted, the line doesn't show.
