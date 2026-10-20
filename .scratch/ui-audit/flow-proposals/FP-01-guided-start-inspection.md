# FP-01: Guided Start Inspection (fewer, grouped screens)

Status: approved-with-changes

Flow changed: F-02 Start Move-in, F-03 Start Move-out (linked), F-04 Start Move-out (unlinked). Screen: S-02 `StartInspectionScreen.tsx`.

Pattern source: Airbnb "Listing a space" set, `.scratch/ui-audit/inspiration/` (step cards in `issue-log.md`).

Approval recorded: the user approved with the changes below. Build work may start on this layout; the Move-in / Move-out choice stays open until the prototype is seen.

## Before (today)

1. Band "Start Move-in" or "Start Move-out", and a Move-in / Move-out segmented control.
2. Move-in: one screen with all seven address fields (Unit number, Building name, Street, Taman, Postcode, City, State). The Inspector fills them in and taps "Start Move-in" in the Dock.
3. Move-out: a list of Move-ins on this phone, or "Type the address" if the Move-in isn't here. Unlinked Move-out: one address form, with a note that it starts with no Areas.
4. Errors show after submit, on all fields at once.

## After (approved with changes)

The address questions are grouped into three screens, not one question per screen. The Review step comes back for every path, including unlinked Move-outs.

| Step | Screen asks | Input | Notes |
|------|-------------|-------|-------|
| 1 | Which kind of Inspection? | Move-in / Move-out segmented control | Stays here until the prototype decides it (see below) |
| 2 | (Move-out only) Which Move-in? | Pick from this phone's Move-ins, or "Not on this phone" | Skipped for Move-in |
| 3 | Which Unit? | Unit number (required), Building or condo name (optional) | Building name has address suggestions |
| 4 | Where is it? | Street (required), Taman or neighbourhood (optional) | Both have address suggestions |
| 5 | Postal details | Postcode (5 digits, required), City (required), State picker (13 states and 3 Federal Territories, required) | Postcode checked as you type |
| 6 | Review | Summary of the address, Edit per field, "Start Move-in" or "Start Move-out" | Errors are shown here, and the first wrong field is focused. Applies to every path. |

The grouping in steps 3–5 is my choice, made to follow the "merge" answer: each group holds fields that belong together. Changing the grouping later is a small edit.

## Settled constraints (do not change)

- Malaysian address fields and validation (spec user story 8–9).
- Address suggestions from earlier addresses on this phone (user story 10).
- Full offline operation. Nothing in the flow calls the network.
- Inspector name prompt still comes first if no name is set.
- The Move-out linking rules stay as they are (ADR 0004, spec user stories 11–14).

## Trade-off

- **Primary goal (time per Inspection):** each Start is one-off per Inspection, so the extra taps cost a few seconds per Inspection, not per Item. The effect on the primary metric is small.
- **Guardrail (mis-filed Defects):** the Review step, with postcode checked as typed, is expected to reduce wrong postcodes and wrong states. This should help the guardrail.
- **Risk:** an Inspector who knows the address taps more than today. The Review step has one "Start" button, so the path stays short.

## Open decisions

1. **Move-in / Move-out choice on step 1:** undecided. The user will decide when they see the prototype. Until then it stays as the current segmented control.

## Decision

- [ ] Approved as written
- [x] Approved with changes: (1) steps 3–8 merged into three screens as in the table; (2) the Review step applies to Move-in and to unlinked Move-out; (3) the Move-in / Move-out placement is left open until the prototype
- [ ] Rejected
