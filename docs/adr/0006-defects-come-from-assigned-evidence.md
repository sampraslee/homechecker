# A Defect exists only as a Defect Type assigned to recorded Evidence

Status: accepted (FP-02 approved with decisions).

## Context

Inspections record Defects only (ADR 0003), and a Defect is supported by Evidence (glossary). The prototype let an Inspector record a Defect from the picker with no Evidence. Such Defects had to be linked later, if at all. The record then held Defects with no proof, which weakens it as evidence in a dispute (the product's purpose, ADR 0001).

## Decision

A Defect is created by assigning a Defect Type to Evidence the Inspector has already recorded on the same Item. The Defect Section is shown once the Item has Evidence. A Defect always links at least one piece of Evidence from creation onward.

## Consequences

- Every Defect has proof from the moment it exists. The "No Evidence linked" state goes away.
- Evidence comes before the Defect Type, which changes the order of the Item workflow.
- Deleting the only Evidence behind a Defect removes that Defect too, after a confirmation, while the Inspection is a Draft. A Defect never exists without its proof. Deleting one of several pieces of Evidence only unlinks it.
- Evidence with no Defect is still allowed (overview photos). Blocking that would contradict ADR 0003.
- The Defect Dictionary, the one-Defect-per-type rule and the Completed lock are unchanged.

## Considered options

- **Evidence optional (today).** Fast, but allows Defects with no proof.
- **Auto-link the only Evidence.** Helpful, but guesses which photo the Defect is about.
- **Warn at Complete.** Catches the gap at the end, after the Inspector has moved on.
- **Evidence first, Defect Type assigned to it (chosen).** Every Defect has proof, at no extra taps for the usual photo-then-type path.

## Why this record matters

This is hard to reverse, since it changes the data model and the order of the workflow. A future reader would ask why a Defect can't exist without Evidence when the Dictionary allows it. The trade-off is real: a few seconds per Inspection in exchange for a record every Defect can be checked against.

## Amendment: Evidence is captured only in Record a Defect

The Item screen's Photo, Video and Note buttons and its list of Evidence are gone; the Item screen lists Defect cards. Evidence is captured in Record a Defect, where a Defect Type is assigned to each piece (or the piece is saved with none). Evidence is opened and deleted from the Defect it supports. Evidence that no Defect links to is no longer listed on the Item screen and cannot be deleted from the app; it stays on record and in the export, and shows under AI Suggestions when it has any.
