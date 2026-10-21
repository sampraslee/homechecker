# Spec: Guided Area and Defect recording

Status: ready-for-agent

Source: the Inspector-mode HTML prototype (`RIZURF_HomeChecker_Airbnb_Style_Inspector_Prototype.html`), `GLOSSARY.md`, ADRs 0001, 0002, 0003, 0006 and 0007. Use glossary terms throughout; never "Label", "Sub-label" or "Room".

## Problem Statement

Recording a Defect happens on one scrolling Item screen that mixes Evidence, Defect Type chips, AI Suggestions and a long picker. The Inspector cannot tell what is done and what comes next. Adding an Area is a single inline panel with the same lack of sequence. The Move-in / Move-out start flow, by contrast, asks one thing per screen and is easy to follow.

## Solution

Two guided flows in the style of the start flow: one decision per screen, a visible "Step n of N" indicator, Back that keeps what was entered, and one forward action in the Dock. Defects also gain a required Severity (ADR 0007).

The Item screen stays as the hub for reviewing and editing. The guided flow is how new Defects are recorded.

### Add Area (2 steps)

1. **Which Area?** Tap a room on a generic placeholder floor plan, pick another standard Area, or type a custom name. The plan is a shortcut only: it stores nothing and is marked as a prototype placeholder.
2. **Name it.** Prefilled and editable ("Bedroom", then "Bedroom 2" if one exists). Then land in the new Area, ready to add Items. Adding Items is unchanged.

### Record a Defect (3 steps, then Saved)

Started from the Item screen, and automatically after an Item is added. Unavailable on a Completed Inspection.

1. **Evidence.** At least one piece of any kind (photo, video, note) before Next.
2. **Defect Types.** One piece of Evidence at a time ("Evidence 2 of 4").
   - A piece can take one or more Defect Types, or **No Defect here** (ADR 0003, 0006).
   - Existing AI Suggestions for a photo show first as one-tap choices above the normal picker.
   - AI is not a blocking step. While online and the photo's suggestions are pending, show "Looking for suggestions…". After 10 seconds, replace it with "Suggestions are taking longer than usual. Carry on and they'll appear in the AI Suggestions list." Offline, show a quiet note instead of a spinner. The picker is never blocked. Late suggestions land in the Item's AI Suggestions list as today.
3. **Severity.** Minor, Moderate or Major for each Defect made in the flow. Nothing preselected, no on-screen definitions.

A **Saved** screen lists the Defects just recorded with their Severity, offering **Record another Defect** (back to step 1, empty) and **Done** (back to the Item screen).

## Rules

- ADR 0006 holds: a Defect Type is assigned to specific Evidence; one Defect per Defect Type per Item.
- Severity is required for every new Defect, on every path, including confirming an AI Suggestion, and including on a Completed Inspection.
- Save as you go. A Defect with no Severity (interrupted flow, or made before this change) is marked "Severity needed". The Complete confirmation counts them. Completing is not blocked.
- Severity shows on the Item's Defect chips, as read-only reference on a linked Move-out, and as a column in the export's Defects sheet.
- Editing an existing Defect keeps today's edit panel, now with Severity.
- Back (button and phone gesture) steps back through the flow, keeping what was entered.

## Out of scope

- A real floor plan or any stored room positions.
- Written Severity definitions.
- Any change to the Item picker, the Defect Dictionary or the Completed lock.
- Anything about urgency, repair priority, cost or responsibility (ADR 0001).
