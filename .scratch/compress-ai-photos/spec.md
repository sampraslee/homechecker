# Spec: Compress photos for AI analysis

Status: ready-for-agent

Source: grilling session on `/mattpocock-skills:grill-with-docs` (rounds 1 to 3). Use glossary terms throughout (`GLOSSARY.md`: Original, Evidence Copy, Thumbnail, Evidence, AI Suggestion, Defect). Builds on `.scratch/home-check-prototype/` (photo evidence and AI suggestions) and ADR 0002 (the AI step stays behind one narrow interface).

## Problem Statement

Each photo sent for AI analysis is an Evidence Copy at up to 2048 pixels on its longest edge. That is larger than the AI step needs. Every photo the Inspector takes uploads more data than it has to, and each AI request is heavier than it has to be.

The Inspector's originals, the export and the videos are not part of this problem. The brief keeps originals untouched, and the export has no size goal in this spec.

## Solution

Photos sent to the AI are resized to 1024 pixels on the longest edge, down from 2048. JPEG quality stays at 0.82, and photos are never enlarged.

Everything else stays as it is. Originals are kept as recorded. The export ships the same files, with the same spreadsheet, as before. Videos are recorded, stored and exported unchanged. The glossary gets three terms: Original, Evidence Copy and Thumbnail.

## User Stories

1. As an Inspector, I want each photo sent for AI analysis to be smaller, so that it uploads faster on mobile data.
2. As an Inspector, I want every photo I take to stay at full resolution on my phone, so that I always have the original record.
3. As an Inspector, I want the AI to still spot defects in the smaller photo, so that its suggestions stay useful.
4. As an Inspector, I want photos I took before this change to keep working, so that my open Inspections aren't disrupted.
5. As an Inspector, I want the exported zip and spreadsheet to be the same as before, so that the people who read them see no change.
6. As an Inspector, I want the export to keep full-resolution photos, so the office has the original detail.
7. As an Inspector, I want videos to be recorded, stored and exported exactly as before, so nothing about recording video changes.
8. As an Inspector, I want the app to keep working when a photo can't be resized, so that I'm never blocked from taking a photo.
9. As an Inspector, I want a photo I took offline to be sent at the new size once I'm back online, so that offline use is unchanged.
10. As an Inspector, I want the AI's suggestions to still come only from the Defect Dictionary, so that nothing unlisted gets recorded.
11. As an Inspector, I want a photo already analysed to keep its suggestions, so that nothing is re-analysed.
12. As an Inspector, I want the Item screen's thumbnails to look the same, so the app looks unchanged.
13. As a product owner, I want the AI-bound size to be one setting in the code, so that it can be tuned later.
14. As a product owner, I want the glossary to say which copy the AI receives, so that the team uses the same words.
15. As a product owner, I want the brief corrected where it says the Evidence copy is used in the export, so that the docs match what's built.
16. As a product owner, I want the change checked on a real iPhone with a real defect photo before it ships, so that the 1024-pixel copy still shows defects clearly.
17. As a developer, I want a test that the AI receives the Evidence copy and never the original, so that a regression is caught.
18. As a developer, I want a test that the export contains originals and no Evidence copies, so that the export contract holds.
19. As a developer, I want the size rule tested without a browser, so that the limit stays correct when the code changes.
20. As a developer, I want photos not yet processed to get the 1024-pixel copy automatically, so that the change applies without a migration.
21. As a developer, I want the AI step's interface unchanged, so that the later move to the shared ingestion system (ADR 0002) isn't affected.

## Implementation Decisions

- **Evidence Copy size:** the longest edge goes from 2048 to 1024 pixels. JPEG quality stays at 0.82. Photos smaller than the limit are not enlarged, as before.
- **Originals:** never compressed, changed or deleted. Unchanged.
- **Thumbnails:** size and quality unchanged.
- **Export:** unchanged. The zip keeps every photo and video original in its media folder. The spreadsheet keeps its embedded thumbnails and links. The Evidence Copy is not part of the export.
- **Videos:** no compression anywhere. Recording settings, storage and video thumbnails are unchanged. Videos never reach the AI, and that stays true.
- **Photos processed before this change:** they keep their existing 2048-pixel Evidence Copy. No regeneration and no migration. Decided in grilling.
- **Photos processed after this change:** their Evidence Copy is 1024 pixels. Photos waiting in the AI queue that are not yet processed get the new size when processed.
- **Ports and interfaces:** the image processor interface keeps its shape: a photo in, an Evidence Copy and a Thumbnail out. The AI client interface is unchanged. The stored records are unchanged, so there is no schema change.
- **AI request:** unchanged. The AI receives the Evidence Copy, the Area and Item names, the relevant Categories and every Dictionary code, and answers in the same structured form.
- **Size rule as a pure function:** the "fit within a longest edge, never enlarge" rule moves into a pure function that takes dimensions and returns the target dimensions. This is the one new seam, and it lets the rule be tested without a browser.
- **Glossary:** Original, Evidence Copy and Thumbnail are added to `GLOSSARY.md`. Evidence Copy avoids "AI copy" and "compressed copy".

## Testing Decisions

- **What makes a good test:** test behavior through the public interface of the core, not the canvas or the exact pixels it produces. The stub image processor and the fake AI client are the seams. Tests check what the AI receives and what the export contains, not how the copy was drawn.
- **Modules tested:**
  - The core's photo capture and AI queue: a photo's Evidence Copy is what the AI receives, never the original. Existing coverage in the AI suggestions tests ("it gets the Evidence copy...") should be kept and extended if needed.
  - The export: the zip contains each photo's original and no Evidence Copy, and the spreadsheet's embedded images are unchanged. Extend the existing export tests.
  - The size rule: new unit tests for the pure function. Cover landscape, portrait and square photos; a photo already within the limit, which must not be enlarged; a photo exactly at the limit; and a very small photo.
- **Manual check (not automated):** on an iPhone and an Android phone, take a photo of a known defect, such as a scratch or damp patch. Confirm that the Evidence Copy's longest edge is 1024 pixels and that the AI still suggests the right Defect Type.
- **Prior art:** the photo tests (capture, stored versions, processing failures), the AI suggestion tests ("what the AI is asked", queueing), and the export tests (zip contents and spreadsheet). The stub image processor and fake AI client in the testing helpers.

## Out of Scope

- Compressing or re-encoding videos, for the AI or the export.
- Changing the export's contents, layout or size. The zip still carries full-resolution originals, so the export size does not shrink because of this spec.
- Tuning JPEG quality beyond 0.82.
- Changing the Thumbnail size.
- Regenerating existing Evidence Copies (decided: not in this spec).
- Changing the AI model, prompt or answer schema.
- Cloud upload, sync, or uploading originals later.
- An ADR. The change is cheap to reverse and the trade-off is small.

## Further Notes

- **Export size goal:** you asked for the export to shrink too. Under the brief, originals stay full resolution in the export. This spec doesn't reduce the zip's or the spreadsheet's size. If that goal comes back, it needs a separate decision, because it changes what the export ships.
- **Brief conflict:** `docs/prototype-brief.md` says the Evidence copy is "used in the export" (§11, the three versions list), but the export doesn't use it, and this spec keeps it that way. The brief should be corrected in the same change.
- **Existing Evidence Copies (decided):** photos processed before this change keep their 2048-pixel copies. They already served the AI, and the export doesn't use them. Regenerating them would be possible because originals are kept, but it isn't needed for the AI step.
- **Glossary:** Original, Evidence Copy and Thumbnail are added to `GLOSSARY.md`.
