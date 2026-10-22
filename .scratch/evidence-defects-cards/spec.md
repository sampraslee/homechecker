# Spec: Evidence and Defects as Defect cards

Status: ready-for-agent

Source: a design brief from the product owner, settled in a grilling session. Builds on `.scratch/inspection-ux-polish/` (the Inspections card, ticket 08) and `.scratch/guided-defect-recording/`. Use glossary terms (`GLOSSARY.md`).

## Problem Statement

The Item screen's Evidence and Defects section is a list of Evidence cards with Defect chips on them, plus Photo, Video and Note buttons under Record a Defect. Two paths put Evidence on an Item, and the list shows Evidence rather than the thing the Inspector is recording: Defects. The AI Suggestions section is a set of cards that mixes already-handled suggestions with the ones still to do.

## Solution

The section lists Defects as cards in the Inspections card design. Evidence enters only through Record a Defect. The AI Suggestions section becomes a flat list of what still needs attention, grouped by Evidence. AI review is locked once an Inspection is Completed, so the app and the export agree.

## Decisions

### Item screen
- The Photo, Video and Note buttons under Record a Defect are removed. Evidence only enters through Record a Defect. ADR 0003 and 0006 and the glossary are amended: Evidence with no Defect can no longer be captured. Existing Evidence with no Defect stays on the record and in the export, and shows in the AI Suggestions list when it has suggestions.
- The Evidence list is removed, with its assign-a-Defect-Type chips and the "No Evidence linked" chips.
- Each Defect is a card in the Inspections card design:
  - Photo area: the Defect's first linked photo, or a placeholder icon when it has only a video or note. The Severity chip sits on the photo where the status chip sits on an Inspection card.
  - Title: the Defect Type name.
  - Meta line: "AI suggested · High confidence" or "Added manually".
  - A labelled "Edit" link; the whole card opens the Defect editor. On a Completed Inspection the link reads "View" and the editor is read-only.
- A Defect is "AI suggested" only when a suggestion was confirmed; it shows the highest confidence of its confirmed suggestions. A Defect from a corrected suggestion counts as manual.
- Cards are ordered by recorded time, oldest first. The header count shows Defects only. The empty state reads "No Defects yet. Tap Record a Defect to start." The "Assign a Defect Type to your Evidence" hint is removed.

### Defect editor
- Each linked photo, video or note can be opened and deleted from the editor, reusing the existing consequences confirmation. Evidence no Defect links to cannot be deleted for now.

### AI Suggestions
- A flat list grouped by Evidence: a header with a small thumbnail, the kind and the time; suggestion rows below with no card chrome.
- Only unreviewed and rejected suggestions show. Confirmed and corrected ones leave the list.
- Unreviewed rows keep Confirm, Correct and Reject. Rejected rows show "Review again", which uses the existing undo in core. The glossary no longer says rejected suggestions are hidden.
- On a Completed Inspection the section is hidden and review is locked, so the app cannot drift from the exported spreadsheet. A suggestion that arrives after completion is still stored, unreviewed. An ADR records this and reverses "review stays open on a Completed Inspection".

## Out of scope
- Ordering Defect cards by Severity.
- A way to delete Evidence that no Defect links to.
- Capturing building photos for Inspection cards.
