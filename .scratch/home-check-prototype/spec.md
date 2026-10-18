# Spec: Home Check Prototype

Status: ready-for-agent

Source: the prototype brief in `docs/` (refined from the original blueprint), `GLOSSARY.md`, and ADRs 0001–0005. Use glossary terms throughout; never "Label", "Sub-label" or "Room".

## Problem Statement

Rizurf Inspectors document the condition of a rental Unit before a tenant moves in and after they move out, but there is no standard way to do it. Defects are described in free-form words, photos are scattered across personal phones with no link to what they show, and nothing ties a Move-out back to its Move-in. Rizurf wants to test whether a standardised, offline, AI-assisted capture tool makes these inspections faster and more consistent, before investing in a full production system with a server, sync and an office web app.

## Solution

A PWA that an Inspector installs from a link on their own iOS or Android phone. It works fully offline. The Inspector starts a Move-in or Move-out Inspection for a Unit, walks through Areas and Items, captures photos, short videos and notes, and records Defects using only the controlled Defect Dictionary. Whenever the phone is online, photos are sent to Gemini, which suggests up to three Defect Types per photo; the Inspector confirms, corrects or rejects each AI Suggestion. All data stays on the phone. When finished, the Inspector exports the Inspection as a .zip (Excel workbook with embedded thumbnails plus full-resolution media) and shares it through the phone's share menu. The export also records timings and AI review outcomes so Rizurf can judge whether the prototype works.

## User Stories

### Setup and installation

1. As an Inspector, I want to install the app from a link on my iPhone or Android phone, so that I don't need an app store or a company device.
2. As an Inspector, I want the app to open and work with no internet once installed, so that I can inspect Units with poor or no signal.
3. As an Inspector, I want to enter my name once in settings, so that every Inspection I create is stamped with who did it.
4. As an Inspector, I want the app to ask the phone to keep its storage permanently, so that my Inspections aren't silently cleared when the phone is low on space.
5. As an Inspector, I want to be told if persistent storage was refused, so that I know to export more often.
6. As an Inspector, I want the app to prompt me to set my name before my first Inspection, so that no Inspection is unattributed.

### Starting an Inspection

7. As an Inspector, I want to start a Move-in Inspection by entering the Unit's address, so that the record is tied to a specific Unit.
8. As an Inspector, I want the address split into Malaysian fields (Unit number, building or condo name, street, area or Taman, postcode, city, state), so that addresses are consistent and can later be matched to a master Unit database.
9. As an Inspector, I want the postcode checked as 5 digits and the state picked from a list of the 13 states and 3 Federal Territories, so that I can't enter an invalid address.
10. As an Inspector, I want the app to suggest addresses I've already entered on this phone as I type, so that I don't create the same Unit twice with different spellings.
11. As an Inspector, I want to start a Move-out Inspection by picking an earlier Move-in Inspection on this phone, so that the two are linked for later comparison.
12. As an Inspector, I want a linked Move-out to copy the Move-in's Unit address and its Areas and Items, so that I don't retype the structure.
13. As an Inspector, I want a linked Move-out to copy only the structure, not the Move-in's Defects or Evidence, so that the Move-out records only what I observe now.
14. As an Inspector, I want to start an unlinked Move-out with a typed address when there's no Move-in on this phone, so that I can still inspect Units whose tenancy predates the app.
15. As an Inspector, I want the start time recorded automatically when I create an Inspection, so that inspection duration can be measured.
16. As an Inspector, I want to see a list of my Inspections with type, address, date and Draft/Completed status, so that I can find and resume one.

### Areas

17. As an Inspector, I want to add Areas from a standard list (Living Room, Master Bedroom, Wet Kitchen, Common Bathroom, etc.), so that Area names are consistent across Inspections.
18. As an Inspector, I want to add an Area that isn't on the standard list, so that unusual layouts can be recorded.
19. As an Inspector, I want to rename an Area (e.g. "Bedroom 2" to "Bedroom 2 – facing road"), so that the record matches the Unit.
20. As an Inspector, I want to add the same standard Area more than once (e.g. several bedrooms) with distinct names, so that each space is recorded separately.
21. As an Inspector, I want to remove an empty Area I added by mistake while the Inspection is a Draft, so that the record stays tidy.

### Items

22. As an Inspector, I want to pick an Item from the Item Catalog, with the Items relevant to the current Area shown first, so that I find the right Item quickly.
23. As an Inspector, I want every catalog Item reachable from any Area, so that I'm never blocked by an unusual placement.
24. As an Inspector, I want to add the same catalog Item more than once in an Area, each with a short name (e.g. "Window – left"), so that repeated things are recorded separately.
25. As an Inspector, I want to add an "Other item" with a free-text name when nothing in the catalog fits, so that I can still record its Defects.
26. As an Inspector, I want to remove an Item I added by mistake while the Inspection is a Draft, so that the record stays accurate.

### Evidence

27. As an Inspector, I want to take photos for an Item from inside the app, so that each photo is attached to the right Item at capture time.
28. As an Inspector, I want to record a video with sound of up to 30 seconds for an Item, so that I can show things a photo can't, like noise or a door that sticks.
29. As an Inspector, I want recording to stop automatically at 30 seconds, so that videos stay short.
30. As an Inspector, I want to add a text note to an Item, so that I can describe location, extent or anything not obvious from the media.
31. As an Inspector, I want every original photo and video kept exactly as captured, so that full-resolution evidence is available in a dispute.
32. As an Inspector, I want thumbnails shown in the app, so that browsing Evidence is fast.
33. As an Inspector, I want each photo saved immediately on capture, so that nothing is lost if the app closes or the phone dies.
34. As an Inspector, I want to delete a piece of Evidence while the Inspection is a Draft, so that wrong shots don't clutter the record.

### Defects (manual)

35. As an Inspector, I want to add a Defect to an Item by picking a Defect Category and then a Defect Type, so that every Defect uses the controlled Dictionary.
36. As an Inspector, I want the Item's relevant Defect Categories shown first, so that I find the right Defect Type quickly.
37. As an Inspector, I want all Defect Categories reachable for any Item, so that I'm never blocked when something unusual is wrong.
38. As an Inspector, I want to use Other / Unknown with a note when nothing in the Dictionary fits, so that I can still record what I see without inventing a name.
39. As an Inspector, I want to be prevented from adding a second Defect with the same Defect Type to the same Item, and taken to the existing one instead, so that each condition is recorded once per Item.
40. As an Inspector, I want to link one or more of the Item's Evidence to a Defect, so that each Defect shows its proof.
41. As an Inspector, I want one photo to support several Defects on the same Item, so that I don't have to take duplicate photos.
42. As an Inspector, I want to add a note to a Defect, so that I can record extent and location (e.g. "three scratches, lower left").
43. As an Inspector, I want to remove a Defect while the Inspection is a Draft, so that I can correct mistakes.
44. As an Inspector, I want to see at a glance which Items have Defects and how many, so that I can check my coverage before completing.

### AI Suggestions

45. As an Inspector, I want every new photo automatically queued for AI, so that I don't have to remember to request suggestions.
46. As an Inspector, I want queued photos sent to the AI whenever the phone is online and the app is open, so that suggestions arrive without extra steps.
47. As an Inspector, I want to see "Waiting for AI: N photos", so that I know how much is still pending.
48. As an Inspector, I want to see "Saved on device" for my work, so that I trust nothing is lost while offline.
49. As an Inspector, I want failed AI requests to stay queued and retry later, so that a bad connection doesn't lose suggestions.
50. As an Inspector, I want the AI to take the Area and Item into account, so that suggestions fit the context (a dark patch on a Bathroom Wall versus a Bedroom Wall).
51. As an Inspector, I want at most three AI Suggestions per photo, each with High, Medium or Low confidence, so that the list is short and I know how much to trust each one.
52. As an Inspector, I want AI Suggestions to only ever be Defect Types from the Dictionary, so that the AI can't invent new names.
53. As an Inspector, I want the AI to return Unable to Determine when it can't identify anything, so that I'm not shown made-up results.
54. As an Inspector, I want to confirm an AI Suggestion so that it becomes a Defect on that Item with the photo as Evidence.
55. As an Inspector, I want confirming a suggestion for a Defect Type the Item already has to link the photo to the existing Defect, so that the one-Defect-per-Defect-Type rule holds.
56. As an Inspector, I want to correct an AI Suggestion by choosing a different Defect Type, so that I keep the AI's head start but record what's right.
57. As an Inspector, I want to reject an AI Suggestion, so that wrong suggestions don't become Defects.
58. As an Inspector, I want to see which AI Suggestions I haven't reviewed yet, so that none are forgotten.
59. As an Inspector, I want AI Suggestions to stay separate from my confirmed Defects and never overwrite them, so that the record reflects my judgement.
60. As an Inspector, I want a Defect created from an AI Suggestion to be marked as AI-suggested, so that the export shows where it came from.

### Completing an Inspection

61. As an Inspector, I want to mark an Inspection Completed, so that it's recorded as finished and its completion time is captured.
62. As an Inspector, I want to complete an Inspection even if photos are still waiting for AI, so that I'm not stuck on site waiting for signal.
63. As an Inspector, I want a Completed Inspection's Defects and Evidence locked, so that the record can't be changed by accident after I leave.
64. As an Inspector, I want to still receive and review AI Suggestions on a Completed Inspection, so that late suggestions aren't wasted.
65. As an Inspector, I want a confirmation step before completing, showing how many photos are waiting for AI and how many AI Suggestions are unreviewed, so that I complete deliberately.

### Export

66. As an Inspector, I want to export an Inspection as a single .zip, so that I can get everything off my phone in one go.
67. As an Inspector, I want the export to open my phone's share menu, so that I can send it by email, WhatsApp or Drive.
68. As an Inspector, I want the .zip to contain an Excel workbook and a media folder of full-resolution originals, so that the spreadsheet is readable and the evidence is complete.
69. As an Inspector, I want the Defects sheet to have one row per Defect with address, Inspection type, date, Inspector, Area, Item, Defect Category, Defect Type code and name, note, source, AI confidence, an embedded thumbnail and links to all its media, so that the spreadsheet stands alone as a report.
70. As an Inspector, I want media links in the spreadsheet to open the files in the media folder after unzipping, so that full evidence is one click away.
71. As Rizurf, I want an AI Suggestions sheet listing every suggestion with its confidence and outcome (confirmed, corrected to which code, rejected, not reviewed), so that we can measure AI accuracy.
72. As Rizurf, I want an Inspection sheet with type, address, Inspector, start, completion, duration, Dictionary version and linked Move-in, so that we can measure inspection time and trace records.
73. As an Inspector, I want to export a Draft Inspection too, so that I can back up partway through a long inspection.
74. As an Inspector, I want to be reminded to export after completing an Inspection, so that the data isn't only on my phone.
75. As an Inspector, I want to see when each Inspection was last exported, so that I know what's backed up.

### Data integrity and privacy

76. As Rizurf, I want each Defect to record the Dictionary version it used, so that old records stay readable after the Dictionary changes.
77. As Rizurf, I want no tenant names or contact details recorded, so that personal data stays off personal phones and we stay within Malaysia's PDPA.
78. As Rizurf, I want the Gemini key kept out of the source repository, so that it isn't leaked through version control.
79. As Rizurf, I want the Dictionary, Item Catalog and standard Area list to be swappable data, so that approved changes to them don't need code changes.

## Implementation Decisions

### Stack

- React + TypeScript + Vite, made installable and offline-capable with vite-plugin-pwa (service worker precaches the app shell). Hosted on a free static host over HTTPS.
- Dexie over IndexedDB for records and media blobs.
- ExcelJS for the workbook (supports embedded images); JSZip for the archive.
- `@google/genai` calling `gemini-3.1-flash-lite` with structured output.
- Vitest with fake-indexeddb for tests.

### Architecture: one core, four adapters

- **Home Check core** — a framework-free TypeScript module that owns every rule in this spec. The UI calls only the core's operations and reads its state; the UI contains no business rules.
- The core depends on four adapter interfaces, injected at construction:
  - **Storage** — persist and load Inspections, Areas, Items, Defects, Evidence metadata, AI Suggestions, the AI queue and media blobs. Production: Dexie. Tests: Dexie on fake-indexeddb, or an in-memory implementation.
  - **AI client** — one operation: given an Evidence-copy image, Area name, Item, the Item's relevant Defect Categories and the allowed Defect Type codes, return up to 3 `{ code, confidence }`. Production: Gemini. Tests: a scripted fake (success, failure, `OT-UNKNOWN`). This is the narrow interface ADR 0002 requires so the AI step can later move server-side or onto the shared Rizurf ingestion system.
  - **Image processor** — from an original photo, produce the Evidence copy (longest edge ~1920–2048 px, JPEG ~80–85%) and a thumbnail; from a video, produce a thumbnail. Production: canvas / video element. Tests: a stub.
  - **Environment** — current time, online/offline state and online/offline change events. Tests: controllable fake.
- **Export** is a core operation: Inspection id → .zip bytes. The UI hands the bytes to the Web Share API (falling back to a download).

### Core operations (indicative)

- Settings: set Inspector name.
- Inspections: start Move-in (address); start Move-out (linked Move-in id, or address); list; get; complete.
- Areas: add (standard or custom name), rename, remove (Draft, empty only).
- Items: add (catalog Item or Other + name, optional short name), rename, remove (Draft).
- Evidence: add photo / video / note to an Item; delete (Draft).
- Defects: add (Item, Defect Type, note, Evidence links); edit note and links; remove (Draft).
- AI: process queue (called on app open, on coming online, and after each capture); list unreviewed AI Suggestions; confirm; correct (to code); reject.
- Export: build zip.
- Address suggestions: list previously entered addresses matching a prefix.

### Domain rules enforced by the core

- An Inspection is Move-in or Move-out, and Draft or Completed. Draft → Completed is the only transition; there is no reopening.
- Completed locks Areas, Items, Evidence and Defects against add/edit/remove. Exception: AI queue processing and AI Suggestion review continue, and confirming or correcting may add a Defect or link a photo to an existing Defect.
- A Move-out may link to one Move-in on the same phone. A linked Move-out copies the Move-in's address, Areas (names) and Items (catalog entry and short name), and nothing else.
- An Item has at most one Defect per Defect Type. Adding a duplicate is refused and reports the existing Defect.
- Evidence belongs to exactly one Item. A Defect may link only Evidence of its own Item. Evidence may link to many Defects.
- Only Defect Types present in the bundled Dictionary version can be recorded, manually or via AI.
- Each Defect records: Defect Type code, Dictionary version, source (manual or AI-suggested), the AI Suggestion it came from (if any), note, linked Evidence.
- AI Suggestions are stored separately from Defects: photo, code, confidence, outcome (`unreviewed` | `confirmed` | `corrected` + corrected code | `rejected`), timestamps. Never overwritten by later AI runs.
- Every captured photo is enqueued for AI exactly once. Queue items are processed one at a time when online; a failure leaves the item queued with an attempt count and retries on the next trigger. Videos and notes are never queued.
- Confirm on a suggestion whose Defect Type already exists on the Item links the photo to that Defect instead of creating a new one.
- Timestamps: Inspection started at (creation), completed at (completion).
- No tenant personal data fields exist in the model.

### Data shapes

- **Unit address** fields: unit number (required), building name (optional), street (required), area / Taman (optional), postcode (required, 5 digits), city (required), state (required, one of 16). Stored on the Inspection; there is no Unit or Property entity in the prototype.
- **Evidence** kinds: photo (original blob, Evidence copy blob, thumbnail blob), video (original blob, thumbnail blob, duration ≤ 30 s), note (text).
- **Reference data** (Defect Dictionary with version, Item Catalog with relevant Defect Categories per Item, standard Area list with Items-shown-first per Area) is bundled as static data loaded by the core. Initial content: the Dictionary exactly as in the blueprint (merges in the brief's Appendix C are pending approval), and the brief's Appendices A and B. Replacing any of these must require no code changes.

### AI request contract

- Input to the model: the Evidence copy image, a prompt containing Area name, Item name, the Item's relevant Defect Categories as preferred hints, and the rules (choose only from the allowed codes, up to 3, `OT-UNKNOWN` if nothing identifiable, observable facts only).
- Structured output schema: an array (max 3) of objects with `code` (enum of every Defect Type code in the bundled Dictionary) and `confidence` (enum `High` | `Medium` | `Low`).
- The client validates the response against the bundled Dictionary and drops anything invalid.
- The API key is injected at build time from an environment variable (never committed). Per ADR 0005 it is restricted to the app's origin and the Generative Language API, with a spending cap.

### Export format

- Zip contents: `inspection.xlsx` and `media/` with every original photo and video in the Inspection, named stably (e.g. by Area, Item and sequence) so links are readable.
- Workbook sheets:
  - **Defects** — one row per Defect: Unit address (single formatted string), Inspection type, Inspection date, Inspector, Area, Item (with short name), Defect Category, Defect Type code, Defect Type name, note, source, AI confidence, embedded thumbnail of the first linked photo, relative hyperlinks to all linked media.
  - **AI Suggestions** — one row per AI Suggestion: Area, Item, photo link, suggested code, confidence, outcome, corrected code.
  - **Inspection** — type, address, Inspector, started at, completed at, duration, Dictionary version, linked Move-in (address and date).
- Export works for Draft and Completed Inspections and records the export time on the Inspection.

### Storage durability

- On first launch, request persistent storage; surface the result in settings.
- After completion, and on the Inspection list for Inspections never exported, prompt the Inspector to export.

### UI (thin)

- Screens: Inspection list; Start Inspection (type, address or Move-in picker); Inspection (Areas); Area (Items); Item (Evidence, Defects, AI Suggestions to review); Defect Type picker (Categories, relevant first); Settings.
- Persistent status bar: "Saved on device" and "Waiting for AI: N photos".
- Camera via file input with capture or getUserMedia; video via MediaRecorder with a 30 s cap.

## Testing Decisions

- **One seam: the Home Check core.** Tests drive the core's public operations with fake adapters and assert on what the core returns and what an export contains. They never reach into storage tables, private functions or React components.
- A good test reads like a user story: "starting a Move-out from a Move-in copies its Areas and Items but no Defects", "a Completed Inspection refuses a new Defect but accepts confirming a late AI Suggestion", "a failed AI request is retried when the phone comes back online".
- Modules under test, all through the core:
  - Inspection lifecycle, locking and Move-out copying.
  - Areas, Items and repeated Items.
  - Defect rules (one per Item and Defect Type, Dictionary-only, Evidence of the same Item only).
  - AI queue (enqueue on photo only, process only when online, retry on failure, results stored separately) and review outcomes (confirm, confirm-onto-existing, correct, reject).
  - Address validation and suggestions.
  - Export: unzip the bytes in the test, read the workbook back with ExcelJS, assert on sheet rows, embedded image presence and that every hyperlink resolves to a file in `media/`.
- The AI client's response validation (drops codes not in the Dictionary, caps at 3) is tested through the core using a fake that returns bad data.
- Not unit-tested: React screens, real Gemini calls, canvas resizing, camera and MediaRecorder. These are checked manually on at least one real iPhone and one real Android phone, including install, offline launch, capture, AI round trip and sharing an export.
- Prior art: none; this is a new repo. These tests set the pattern.

## Out of Scope

- Any server, database or object storage; sync; upload of originals; deleting local originals.
- Office/Admin web app, office review, change history.
- User accounts and sign-in.
- Server-side key handling (pass-through function).
- Shared Rizurf ingestion system.
- Video compression; AI on video or audio; standalone audio recording.
- Combined multi-signal AI confidence.
- Move-in vs Move-out comparison screens.
- Unit or Property entities and a master Unit database.
- Linking across phones; importing exports.
- Tenant signatures, PDF reports, sending to tenants.
- In-app editing of the Dictionary, Item Catalog or Area list; Bahasa Malaysia.
- Recording good condition (overview Evidence or "no defects" marks) — ADR 0003.
- Applying the Dictionary merges in the brief's Appendix C until approved.

## Further Notes

- Pending approval by the blueprint's owner: standard Area list, Item Catalog, Dictionary merges and cause-implying codes. The build must not block on these; they arrive as new reference-data versions.
- iOS risk: website storage can be cleared under storage pressure even for home-screen apps. Persistent-storage request plus export reminders are the mitigation; if testers lose data, the fallback is wrapping the same code with Capacitor (no change to the core).
- The Gemini key is visible to anyone who opens the app (ADR 0005). Acceptable for a few internal testers only; must move server-side before production.
- Success measures for the trial: time per Inspection and AI Suggestion confirm / correct / reject rates, both read from the export, plus Inspector feedback gathered outside the app.
