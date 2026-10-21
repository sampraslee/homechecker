# Each Defect carries a Severity, defined as an observed degree

Status: accepted.

## Context

Home Check records observable facts only (ADR 0001). Defects are now recorded in a guided flow (Evidence, then Defect Type, then Severity), and the Inspector is the person best placed to say how far a condition has gone. A Defect Type alone says what is wrong, not how much of it there is.

## Decision

Every new Defect is given a Severity of Minor, Moderate or Major. Severity is the Inspector's observed degree of that one Defect. It never means urgency, repair priority, cost or responsibility, which stay outside Home Check (ADR 0001). The scale is the same for every Defect Category and carries no written definitions on screen.

A Defect made before this change, or one left unfinished when the Inspector was interrupted, may have no Severity. It is marked "Severity needed", and the Complete confirmation counts how many are missing. Completing is not blocked, to keep inspections fast (ADR 0003).

## Consequences

- This clarifies ADR 0001 and does not reverse it. Severity is a judgement about degree, so it is less factual than a Defect Type; the rule above keeps it from becoming a risk or repair rating.
- Confirming an AI Suggestion also asks for a Severity.
- Severity shows on the Item's Defects, on the Move-in reference during a linked Move-out, and in the export.
- With no written definitions, two Inspectors may read "Moderate" differently. This is accepted for the prototype and can be revisited from the exported data.

## Considered options

- **No Severity.** Simplest and strictly factual, but every Defect looks equally serious.
- **Optional Severity.** Faster, but leaves most Defects unrated and the data patchy.
- **Required, with definitions per level.** More consistent, but slower and not wanted for the prototype.
- **Required Severity, no definitions (chosen).**

## Why this record matters

It adds a judgement to a record that was deliberately facts-only, so a future reader will ask why. The trade-off is real: a little consistency is given up to keep the flow short.
