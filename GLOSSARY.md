# Home Check

Home Check records the observable condition of a rental property and the evidence behind it, before a tenant moves in and after a tenant moves out. It records facts only; other systems may consume them later.

## People

**Inspector**:
An in-house Rizurf staff member who carries out inspections on site.
_Avoid_: Surveyor, checker, agent

## Inspections

**Inspection**:
One visit to a Unit by an Inspector to record its Defects. It is either Draft (still being recorded) or Completed (finished and locked).
_Avoid_: Check, survey, Home Check (the product name)

**Move-in Inspection**:
An Inspection made before a tenant moves in.
_Avoid_: Check-in, ingoing inspection

**Move-out Inspection**:
An Inspection made after a tenant moves out, linked to the Move-in Inspection of the same tenancy when one exists.
_Avoid_: Check-out, outgoing inspection

## Places and things

**Unit**:
One rentable home that an Inspection covers, identified by its address.
_Avoid_: Apartment, flat, premises

**Area**:
A named space within a property being inspected, such as Master Bedroom or Kitchen.
_Avoid_: Room, zone, location

**Item**:
A thing within an Area that can carry Defects, such as a Wardrobe, Wall or Air Conditioner. Chosen from the Item Catalog; the same catalog entry may appear more than once in an Area, each with a short distinguishing name.
_Avoid_: Asset, fixture, element

**Item Catalog**:
The controlled list of Items, each mapped to the Defect Categories relevant to it.
_Avoid_: Item list, inventory

## Defects

**Defect Dictionary**:
The controlled, coded vocabulary of Defect Categories and Defect Types (Master Home Check Defect Label Dictionary V1). Nothing outside it may be recorded.
_Avoid_: Taxonomy, label list, master labels

**Defect Category**:
A group in the Defect Dictionary, such as `SF` Surface & Finish.
_Avoid_: Label

**Defect Type**:
One coded entry in the Defect Dictionary, such as `SF-SCRATCH` Scratched.
_Avoid_: Sub-label, defect code, tag

**Defect**:
One recorded finding: an Item paired with a Defect Type, supported by Evidence and given a Severity. An Item has at most one Defect per Defect Type; extent and location go in its Evidence and note.
_Avoid_: Issue, finding, fault

**Severity**:
The Inspector's observed degree of one Defect: Minor, Moderate or Major. It describes the condition only, never urgency, repair priority, cost or responsibility.
_Avoid_: Priority, risk, urgency, grade

**Evidence**:
A photo, video, audio recording or text note captured for one Item to support one or more of that Item's Defects.
_Avoid_: Media, attachment, proof

**AI Suggestion**:
A Defect Type proposed by the vision model for a photo. It only becomes a Defect when a person confirms it, and is kept separately from the confirmed result.
_Avoid_: AI label, prediction, classification
