# AI Suggestions can no longer be reviewed once an Inspection is Completed

Status: accepted. Reverses the earlier rule that review stays open on a Completed Inspection.

## Context

When an Inspection is Completed, its record is locked and can be exported as a spreadsheet. Review of AI Suggestions used to stay open after completion, so a suggestion that arrived late (a photo still waiting for the AI when the Inspector completed) was not wasted. But a Defect made by confirming or correcting a suggestion after completion changes the record after the Inspector has locked it, and after it may already have been exported. The app and the spreadsheet would then disagree.

## Decision

Once an Inspection is Completed, confirming, correcting, rejecting and undoing the review of an AI Suggestion are all refused with the same reason as any other change (`inspection-completed`). The Item screen hides the AI Suggestions section. The Complete screen tells the Inspector to review first.

A suggestion that arrives after completion is still stored, unreviewed. Nothing is dropped, and the export treats it as unreviewed, as it already does for any suggestion never reviewed.

## Consequences

- A Completed Inspection's Defects never change, so the app and its export always agree.
- A late suggestion cannot become a Defect. The Inspector who wants it must review before completing.
- The Complete screen already counts photos waiting for AI and suggestions not reviewed; those counts now matter more, and its copy says review ends at completion.

## Considered options

- **Keep review open after completion (before).** Wastes no late suggestions, but the record changes after it is locked and exported.
- **Stop sending photos to the AI after completion.** Stops late suggestions, but loses data that costs nothing to keep and changes the AI queue for no gain.
- **Lock review and keep storing suggestions (chosen).** The record is fixed at completion, and no data is thrown away.
