# UI audit inventory

Source of truth for the audit's scope. Screens come from the `Screen` union and `CurrentScreen` switch in `src/ui/App.tsx`. Flows come from the user stories in `.scratch/home-check-prototype/spec.md`. Every row gets screenshots under `screens/` before it is scored.

Status: partial. Screens S-01 to S-05 captured as text and observations in `screens/captures-2026-10-20.md`. Walkthroughs T-01 and T-02 partial; T-03 to T-06 not run. S-06 not captured.

## Screens

| ID | Screen | Code | Entry point | States to capture |
|----|--------|------|-------------|-------------------|
| S-01 | Inspection list | `InspectionListScreen.tsx` (`list`) | App start, back from anywhere | empty, populated, Draft and Completed mixed |
| S-02 | Start Inspection | `StartInspectionScreen.tsx` (`start`) | List → new | blank, address validation error, address suggestions shown, Move-out linked to a Move-in, Move-out unlinked |
| S-03 | Inspection | `InspectionScreen.tsx` (`inspection`) | List row | Draft, Completed/locked, no Areas, many Areas, Add Area open, export action |
| S-04 | Area | `AreaScreen.tsx` (`area`) | Inspection → Area | empty, populated, `addingItem` open, rename, remove (Draft only) |
| S-05 | Item | `ItemScreen.tsx` (`item`) | Area → Item | no evidence, photos, video, note, Defect list, AI Suggestion pending, Locked |
| S-06 | Settings | `SettingsScreen.tsx` (`settings`) | Dock or list | name unset, name set, storage granted, storage refused |

## Shared components and panels

| ID | Component | Code | Where it appears |
|----|-----------|------|------------------|
| C-01 | Band (header with back/Done) | `Band.tsx` | S-02 to S-06 |
| C-02 | Dock (bottom message/action bar) | `Dock.tsx` | Screens with a pending action |
| C-03 | Defect Type picker | `DefectPanels.tsx` (`DefectTypePicker`) | S-05 |
| C-04 | AI Suggestion list | `AiSuggestionList.tsx` | S-05 |
| C-05 | Inspector name form | `InspectorNameForm.tsx` | S-06, first Inspection |
| C-06 | Name editor | `NameEditor.tsx` | S-03, S-04, S-05 |
| C-07 | Video recorder | `VideoRecorder.tsx` | S-05 (30 s limit) |
| C-08 | Error notice | `ErrorNotice.tsx` | any |

## Flows

Each flow is audited as a whole, from its entry screen to its finish. Changing any flow needs the user's yes first.

| ID | Flow | Screens touched | Core job |
|----|------|-----------------|----------|
| F-01 | Set up inspector name | S-06 (via list) | Enter name once |
| F-02 | Start Move-in | S-01 → S-02 → S-03 | Create an Inspection for a Unit |
| F-03 | Start Move-out (linked) | S-01 → S-02 → S-03 | Copy structure from a Move-in |
| F-04 | Start Move-out (unlinked) | S-02 → S-03 | Typed address, no Move-in on phone |
| F-05 | Add Area | S-03 → S-04 | Record a space |
| F-06 | Add Item and record a Defect | S-04 → S-05 | Record a defect with a Defect Type |
| F-07 | Capture evidence (photo, video, note) | S-05 | Attach proof to an Item |
| F-08 | Review AI Suggestion | S-05 | Confirm, correct or reject |
| F-09 | Complete and lock | S-03 | Finish the Inspection |
| F-10 | Export and share | S-03 | Send the .zip |

## Task walkthroughs (Phase 1, step 3)

Five to seven core jobs to time and count. Fill in during the walkthrough.

| Task | Flow | Steps | Taps | Errors | Finished? | Notes |
|------|------|-------|------|--------|-----------|-------|
| T-01 | F-02 | | | | | |
| T-02 | F-06 | | | | | |
| T-03 | F-07 | Added a note to a Window (throwaway Move-in). Record video not run: needs the camera. | 4 (Add Area, Living Room, Add Item, Add note, Save) | 0 | Note yes; video no | Note saved and shown as "1 note". |
| T-04 | F-08 | Added Defect (Hairline Crack), linked the note by reopening the Defect, saved. AI Suggestion not run: no photo, so the AI queue stayed empty. | ~9 | 0 | Partial | Defect shows "No Evidence linked" until the Inspector reopens it (UX-012). Toast overlaps the Dock (UX-011). |
| T-05 | F-09 | Complete → confirm sheet (Areas 1, Items 1, Evidence 1, Defects 1) → Complete. | 2 + confirm | 0 | Yes | Locked, Completed status, "Export it now" prompt. Copy is clear. |
| T-06 | F-10 | Export now → "Export downloaded." | 1 | 0 | Yes | Last exported updated. The Export button moved from the Dock into the body after completion (UX-001). |

Other observations on the throwaway Inspection: the Inspection screen has a "Delete Inspection" button next to Export and Complete with no visible separation (UX-013, to verify visually). Test Inspection left in the preview data: "T-03, Walkthrough Road" (Completed, exported).
