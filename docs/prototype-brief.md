# Home Check Prototype — Brief

This brief defines the **first build of Home Check: a prototype for testing** with a few Rizurf Inspectors. It refines the original [Home Check Defect Capture & AI Blueprint](./Home%20Check%20Defect%20Capture%20%26%20AI%20Blueprint.md), which stays unchanged as the source document. Where they disagree, this brief wins for the prototype.

- Vocabulary: [GLOSSARY.md](../GLOSSARY.md). Use its terms; avoid the words it lists under _Avoid_ (notably "Label", "Sub-label" and "Room").
- Decisions and their reasons: [docs/adr/](./adr/).
- Items marked **[needs approval]** are drafts awaiting sign-off from the blueprint's owner. Build so they can change without code changes (they are data, not logic).

---

## 1. Purpose

Rizurf staff document the condition of a rental Unit **before a tenant moves in** and **after a tenant moves out**. Home Check records **observable Defects and the Evidence behind them**, standardised against a controlled Defect Dictionary, with AI suggesting Defect Types from photos and the Inspector confirming them.

Principle: **Capture → Standardise → Preserve Evidence → AI Assist → Human Confirm → Store.**

The prototype must prove that this works on site and that the AI is useful (see §12).

## 2. Non-goals

Home Check records facts only ([ADR 0001](./adr/0001-home-check-records-facts-only.md)). It does **not** do, now or later:

- Inventory management
- Repair management or repair recommendations
- Cost estimation
- Landlord/tenant responsibility assessment
- Contractor management
- Safety or risk assessment

Other systems may consume Home Check data for these later, as separate modules.

Also out of the prototype: everything listed in §14 "Deferred to later".

## 3. Users, devices and app format

- **Users:** Inspectors only — in-house Rizurf staff. No other roles, no accounts, no sign-in.
- **Devices:** the Inspector's own phone, **iOS or Android**.
- **Format:** a **PWA** (web app installed to the home screen from a link). It must work **fully offline** once installed. It is served from a free static host that only serves app files and stores no data.
- **Storage:** all data lives **on the phone only** ([ADR 0004](./adr/0004-prototype-is-device-only.md)). The app requests persistent browser storage and reminds the Inspector to export after each Inspection, because the OS can clear website storage when the phone is low on space.
- **Settings:** the Inspector enters their **name** once; it is stamped on every Inspection they create.
- **Language:** English only.
- **Future path:** keep the code portable so it can later be wrapped as a native app with Capacitor.

## 4. Data model

```
Inspection (Move-in | Move-out; Draft | Completed)
 ├─ Unit address
 ├─ Inspector name, started at, completed at
 ├─ linked Move-in Inspection (Move-out only, optional)
 └─ Area (from the standard list, or added/renamed by the Inspector)
     └─ Item (from the Item Catalog, or "Other item" + free text; may repeat with a short name)
         ├─ Evidence (photo | video | text note)
         ├─ AI Suggestion (per photo; kept separately)
         └─ Defect (Item + one Defect Type; links to one or more of the Item's Evidence)
```

### Unit address (Malaysia)

Separate fields, not one free-text box, so addresses can later be matched to a master Unit database:

| Field | Required | Notes |
| --- | --- | --- |
| Unit number | Yes | e.g. `A-12-3`, `No. 15` |
| Building / condo name | No | |
| Street | Yes | e.g. `Jalan SS 2/24` |
| Area / Taman | No | |
| Postcode | Yes | 5 digits |
| City | Yes | |
| State | Yes | Pick from the 13 states and 3 Federal Territories |

As the Inspector types, suggest addresses already entered on this phone to avoid duplicates. There is no Property level in the prototype; the building name is just an address field.

### Reference data

- **Defect Dictionary** — the coded list of Defect Categories and Defect Types (from the blueprint's "Master Home Check Defect Label Dictionary V1"). Bundled with the app, **versioned**, not editable in the app. Each Defect records the Dictionary version it used.
- **Item Catalog** — Items, each mapped to its relevant Defect Categories (Appendix B). Bundled, versioned, not editable.
- **Standard Area list** — Appendix A. Bundled; the Inspector can add or rename Areas within an Inspection.

The blueprint's section 3 label list is **superseded** by the coded Dictionary and must not be used.

## 5. Capture flow

1. **Start an Inspection.** Choose Move-in or Move-out.
   - **Move-in:** enter the Unit address.
   - **Move-out:** pick an earlier Move-in Inspection **on this phone**; the Move-out copies its Unit address and its Area/Item structure and records the link. If there is no Move-in on this phone, enter the address and start unlinked.
2. **Pick an Area.**
3. **Pick an Item**, with Items relevant to that Area shown first (Appendix A). The same catalog Item can be added more than once in an Area, each with a short name (e.g. "Window – left").
4. **Capture Evidence** for the Item: photos, video (max 30 seconds, with sound) or a text note.
5. **Add Defects**, either:
   - **Manually:** pick a Defect Category, then a Defect Type. The Item's relevant Categories are shown first; all Categories are reachable.
   - **From AI Suggestions**, when they arrive (§9).
6. **Link Evidence to Defects.** A piece of Evidence belongs to one Item and can support several of that Item's Defects.
7. **Mark the Inspection Completed** (§10).

### Defect rules

- A Defect is one Item + one Defect Type. An Item has **at most one Defect per Defect Type**; three scratches on one wall are one `SF-SCRATCH` Defect whose Evidence and note show where and how many.
- **Only Defects are recorded** ([ADR 0003](./adr/0003-record-defects-only.md)). No overview Evidence per Area and no "no defects" mark per Item.
- Only Defect Types from the Dictionary can be recorded. Anything else uses `OT-OTHER` / `OT-UNKNOWN` plus a note.

## 6. Evidence

| Kind | Prototype | Notes |
| --- | --- | --- |
| Photo | Yes | Sent to AI |
| Video with sound | Yes | 10–30 s, capped at 30 s, phone's normal quality, not sent to AI |
| Text note | Yes | Typed (dictation via the phone keyboard is fine) |
| Standalone audio | **No** | Video already captures sound |

### Photo processing (on the phone)

For every photo, keep three versions:

1. **Original** — kept, never overwritten or deleted by the app.
2. **Evidence copy** — longest edge 1024 px, JPEG ~80–85% quality. Sent to the AI only; it is not part of the export.
3. **Thumbnail** — small, for fast display in the app and embedding in the Excel file.

The export carries each photo's and video's original, unchanged.

Videos are not compressed or re-encoded in the prototype; the original is kept, plus a thumbnail.

## 7. Offline behaviour

Everything in §5 works with no internet. Only the AI step needs a connection.

The app shows clear status, e.g.:

> **Saved on device** · **Waiting for AI: 4 photos**

## 8. AI step

- **Model:** Google `gemini-3.1-flash-lite`, called **directly from the app** with structured output.
- **API key:** held in the app ([ADR 0005](./adr/0005-gemini-key-in-prototype-app.md)). It is readable by anyone who opens the app, so: restrict the key to the app's web address and the Generative Language API, set a spending cap in Google Cloud, and **never commit the key to the repo** (inject it at build time). Move it behind a server-side function before any production build.
- **Isolation:** keep the AI call behind one narrow interface — *(photo, Area name, Item) in → AI Suggestions out* — so it can later move to a server or to the shared Rizurf ingestion system ([ADR 0002](./adr/0002-standalone-ai-step-for-v1.md)).

### Request

- The **Evidence copy** of one photo.
- The **Area name** and the **Item** (generic Items like Wall, Floor or Tap mean different things in a Bathroom vs a Bedroom).
- The Item's relevant Defect Categories, as hints to prefer.
- The full list of allowed Defect Type codes, enforced as an **enum in the structured-output schema**, so the model cannot return a code outside the Dictionary.

### Response

- **Up to 3 AI Suggestions**, each: Defect Type code + confidence **High / Medium / Low**.
- If nothing is identifiable: `OT-UNKNOWN`.
- No combined confidence score from multiple signals in the prototype; the model's own High/Medium/Low is shown as-is.

## 9. AI queue and review

- Every new photo joins the **AI queue**. Whenever the phone is online **and the app is open**, queued photos are sent one at a time. Failures stay queued and retry.
- AI Suggestions are reviewed **by the Inspector, in the app**. Each one is either:
  - **Confirmed** → becomes a Defect on that Item (or, if that Item already has a Defect with that Defect Type, the photo is linked to it), with the photo as Evidence.
  - **Corrected** → the Inspector picks a different Defect Type, which becomes the Defect.
  - **Rejected** → no Defect.
- **AI Suggestions and confirmed Defects are stored separately.** AI output never overwrites a confirmed Defect. Each AI Suggestion keeps its code, confidence and review outcome (confirmed / corrected-to-code / rejected / not yet reviewed).

## 10. Inspection lifecycle

- **Draft** — being recorded; everything is editable.
- **Completed** — the Inspector marks it finished; the completion time is recorded.
  - Defects and Evidence are then **locked**, with one exception: AI Suggestions still waiting can arrive and be reviewed, which may add Defects.
  - An Inspection can be Completed while photos are still waiting for AI.
- No change history in the prototype.

## 11. Export

Data leaves the phone **only** via export. Per Inspection, the app builds a **.zip** and opens the phone's share menu (email, WhatsApp, Drive, …). The export is also the backup. Importing a zip back is out of scope.

The zip contains:

- `inspection.xlsx`
- `media/` — full-resolution originals of every photo and video in the Inspection, referenced by relative links from the spreadsheet.

`inspection.xlsx` sheets:

1. **Defects** — one row per Defect:
   Unit address · Inspection type · Inspection date · Inspector · Area · Item · Defect Category · Defect Type code · Defect Type name · Note · Source (AI-suggested or manual) · AI confidence (if any) · **embedded thumbnail** of the first photo · links to all its photos and videos.
2. **AI Suggestions** — one row per AI Suggestion: Area · Item · photo link · suggested code · confidence · outcome (confirmed / corrected to code / rejected / not reviewed).
3. **Inspection** — type, Unit address, Inspector, started at, completed at, duration, Dictionary version, linked Move-in (if any).

## 12. What the prototype must prove

- **Testers:** 2–3 Inspectors on real Move-in and Move-out Inspections.
- **Measures:**
  - **Time per Inspection** (started → completed, in the export).
  - **AI accuracy:** share of AI Suggestions confirmed, corrected and rejected (from the AI Suggestions sheet).
  - **Inspector feedback** on finding Items and Defect Types (gathered outside the app).

## 13. Constraints

- **Personal data:** record **no tenant names or contact details**. Data sits on personal phones, and Malaysia's PDPA applies.
- **Evidence integrity:** originals are never altered or deleted by the app.
- **Dictionary-only:** nothing outside the Dictionary is recorded, by the Inspector or the AI.

## 14. Deferred to later

From the blueprint, kept for a production build — **do not build in the prototype**:

- Cloud backend, database and object storage; sync and background upload; upload rules for mobile data vs Wi-Fi; deleting local originals after confirmed upload.
- Office/Admin web app: searching Inspections, office review of AI Suggestions, corrections with change history.
- User accounts and sign-in.
- Server-side API key handling.
- Shared Rizurf ingestion system (capture → queue → AI router → structured output → human validation → audit trail) — [ADR 0002](./adr/0002-standalone-ai-step-for-v1.md).
- On-device video compression; AI analysis of video or audio; standalone audio recording.
- Combined AI confidence scoring (image quality, competing classifications, model consistency, historical corrections).
- Move-in vs Move-out comparison screens (the prototype already links the two so this can be built later).
- Master Unit database and a Property level above Units.
- Linking a Move-out to a Move-in recorded on another phone; importing exports.
- Tenant signatures, PDF reports, sending anything to tenants.
- Editing the Dictionary or Item Catalog in-app; Bahasa Malaysia translation.

## 15. Needs approval before or during the build

1. **Standard Area list** — Appendix A.
2. **Item Catalog** and its relevant Defect Categories — Appendix B.
3. **Dictionary duplicate merges** — Appendix C. Until approved, build with the Dictionary exactly as in the blueprint; applying the merges must only mean swapping in a new Dictionary version.
4. **Codes that imply a cause** — Appendix C, part 3.

---

## Appendix A — Standard Area list [needs approval]

Each Area lists the Items shown first when it is picked. All catalog Items remain reachable from any Area.

| Area | Items shown first |
| --- | --- |
| Entrance / Foyer | Main Door, Door Grille / Gate, Wall, Floor, Ceiling, Light Fitting, Switch, Shoe Cabinet, Intercom / Doorbell |
| Living Room | Wall, Floor, Ceiling, Window, Sliding Door, Curtain / Blind, Light Fitting, Ceiling Fan, Air Conditioner, Switch, Power Socket, Sofa, TV Cabinet |
| Dining Area | Wall, Floor, Ceiling, Light Fitting, Ceiling Fan, Dining Table, Chair, Switch, Power Socket |
| Dry Kitchen | Wall, Floor, Ceiling, Kitchen Cabinet, Countertop, Hob, Cooker Hood, Oven, Refrigerator, Sink, Tap, Power Socket, Light Fitting |
| Wet Kitchen | Wall, Floor, Ceiling, Kitchen Cabinet, Countertop, Hob, Sink, Tap, Floor Trap, Window, Power Socket |
| Master Bedroom | Wall, Floor, Ceiling, Internal Door, Window, Curtain / Blind, Wardrobe, Bed Frame, Mattress, Air Conditioner, Ceiling Fan, Light Fitting, Switch, Power Socket |
| Bedroom (2, 3, …) | Same as Master Bedroom |
| Master Bathroom | Wall, Floor, Ceiling, Internal Door, Toilet, Basin, Vanity Cabinet, Tap, Shower Set, Shower Screen, Mirror, Water Heater, Exhaust Fan, Floor Trap, Bathroom Accessories |
| Common Bathroom | Same as Master Bathroom |
| Powder Room | Wall, Floor, Toilet, Basin, Tap, Mirror, Exhaust Fan, Light Fitting |
| Balcony | Floor, Wall, Sliding Door, Balcony Railing, Floor Trap, Light Fitting |
| Yard / Utility | Floor, Wall, Washing Machine, Sink, Tap, Floor Trap, Window, Clothes Drying Rack |
| Store Room | Wall, Floor, Ceiling, Internal Door, Shelf, Light Fitting |
| Utility / Maid's Room | Wall, Floor, Ceiling, Internal Door, Window, Light Fitting, Switch, Power Socket |
| Corridor / Hallway | Wall, Floor, Ceiling, Light Fitting, Switch |
| Staircase | Staircase / Handrail, Wall, Ceiling, Light Fitting |
| Car Porch | Floor, Auto Gate, Gate, Light Fitting, Ceiling |
| Garden / Exterior | Exterior Wall, Floor, Gate, Fence, Roof / Gutter, Light Fitting |
| General (whole Unit) | Keys & Access Cards, Remote Controls, Distribution Board, Water Meter Area |

## Appendix B — Item Catalog [needs approval]

Relevant Defect Categories are shown first, in this order. `OT` Other / Unknown is always available. Category codes: see the Dictionary.

| Item | Relevant Defect Categories |
| --- | --- |
| Wall | SF, CD, WM, MB, CL, PD, IW |
| Exterior Wall | SF, CD, WM, MB, CL, PD |
| Ceiling | SF, CD, WM, MB, PD, CL |
| Floor | FL, SF, PD, CD, WM, CL |
| Skirting | SF, PD, CD, AF, WM, CL |
| Main Door | DW, AF, HF, SF, PD, GM |
| Internal Door | DW, AF, HF, SF, PD, WM |
| Sliding Door | DW, AF, HF, GM, SF, CL |
| Window | DW, GM, AF, HF, WM, CL |
| Door Grille / Gate | HF, AF, SF, PD, FO |
| Auto Gate | FO, AF, HF, EL, NV, SF |
| Gate | HF, AF, SF, PD |
| Fence | PD, SF, CD, MI |
| Balcony Railing | PD, AF, SF, HF, GM |
| Staircase / Handrail | PD, AF, SF, FL, HF |
| Roof / Gutter | WM, PD, CD, CL, MB |
| Curtain / Blind | CB, CL, PD, HF, FO |
| Light Fitting | LT, FO, EL, MI, CL |
| Ceiling Fan | FO, NV, EL, AF, CL, MI |
| Air Conditioner | AC, FO, WM, NV, EL, CL |
| Exhaust Fan | AC, FO, NV, CL, EL |
| Switch | EL, FO, PD, SF |
| Power Socket | EL, PD, SF, MI |
| Distribution Board | EL, FO, MI, PD |
| Water Heater | AP, FO, WM, PL, EL |
| Intercom / Doorbell | FO, EL, PD, MI |
| Kitchen Cabinet | CF, HF, AF, SF, PD, WM, CL |
| Shoe Cabinet | CF, HF, AF, SF, PD |
| Vanity Cabinet | CF, HF, WM, SF, PD, MB |
| Wardrobe | CF, HF, AF, SF, PD, MI |
| TV Cabinet | CF, HF, SF, PD |
| Shelf | CF, PD, SF, AF |
| Countertop | SF, PD, CD, WM, CL, IW |
| Sink | PL, WM, PD, CL, SN |
| Tap | PL, WM, AF, SF, SN |
| Floor Trap | PL, CL, OD, MI |
| Toilet | SN, PL, WM, CL, PD |
| Basin | SN, PL, WM, CL, PD |
| Shower Set | SN, PL, FO, WM, CL |
| Bathtub | SN, PL, WM, PD, CL |
| Shower Screen | GM, AF, HF, WM, CL |
| Mirror | GM, AF, CL |
| Bathroom Accessories | SN, HF, MI, SF |
| Hob | AP, FO, CL, EL |
| Cooker Hood | AP, FO, NV, CL |
| Oven | AP, FO, CL, EL |
| Refrigerator | AP, FO, WM, NV, CL |
| Washing Machine | AP, FO, WM, NV, PL |
| Clothes Drying Rack | PD, HF, AF, SF |
| Bed Frame | PD, HF, AF, SF, PE |
| Mattress | CL, PD, PE, OD |
| Sofa | PD, CL, SF, PE, WD |
| Dining Table | SF, PD, AF, HF |
| Chair | PD, SF, AF, HF |
| Keys & Access Cards | MI, FO |
| Remote Controls | MI, FO |
| Water Meter Area | PL, WM, CL |
| Other item (free text) | All Categories |

## Appendix C — Dictionary duplicate merges [needs approval]

**Why:** when two codes mean the same thing, Inspectors and the AI split the same defect across both, which breaks the Move-in vs Move-out comparison. The Item already says *what* is affected, so the Defect Type only needs to say *what is wrong*. Rule: one code per real-world condition; keep an item-specific code only where it says something a general code can't.

### Part 1 — Item-specific codes that duplicate a general code

| Remove | Use instead |
| --- | --- |
| **Ceiling / Wall (`CW`) — whole category** | |
| CW-HAIRLINE Hairline Crack | CD-HAIRLINE |
| CW-OPENCRACK Open Crack | CD-OPENCRACK |
| CW-PEEL Paint Peeling | SF-PEEL |
| CW-BUBBLE Paint Bubbling | SF-BUBBLE |
| CW-WATERMARK Watermark | WM-WATERMARK |
| CW-DAMP Damp Area | WM-DAMP |
| CW-MOULD Mould | MB-MOULD |
| CW-HOLE Hole | PD-HOLE |
| CW-PATCH Visible Patch | IW-PATCH |
| CW-UNEVEN Uneven Surface | SF-UNEVEN |
| CW-SAG Ceiling Sagging | CD-SAG |
| CW-DAMAGE General Wall/Ceiling Damage | SF-SURFACE-DMG |
| **Door / Window (`DW`)** | |
| DW-STICK Sticking | AF-STICK |
| DW-JAM Jammed | AF-JAM |
| DW-MISALIGN Misaligned | AF-MISALIGN |
| DW-OPENFAIL Cannot Open Properly | AF-OPEN |
| DW-CLOSEFAIL Cannot Close Properly | AF-CLOSE |
| DW-LOCKFAIL Lock Fault | HF-LOCK-FAULT |
| DW-HINGE Hinge Fault | HF-HINGE-LOOSE / HF-HINGE-BROKEN |
| DW-TRACK Track Fault | HF-TRACK-FAULT |
| DW-ROLLER Roller Fault | HF-WHEEL-FAULT (rename "Faulty Wheel / Roller / Caster") |
| DW-SEAL Seal Fault | HF-SEAL-DMG |
| DW-GAP Excessive Gap | AF-GAP |
| _Keep:_ DW-FRAME Frame Damage, DW-MESH Mosquito Mesh Damage | |
| **Cabinet / Furniture (`CF`)** | |
| CF-HINGE Hinge Fault | HF-HINGE-LOOSE / HF-HINGE-BROKEN |
| CF-RUNNER Drawer Runner Fault | HF-RUNNER-FAULT |
| CF-HANDLE Handle Fault | HF-HANDLE-LOOSE / HF-HANDLE-BROKEN |
| CF-DOOR-MISALIGN Door Misaligned | AF-MISALIGN |
| CF-DRAWER-MISALIGN Drawer Misaligned | AF-MISALIGN |
| CF-LAMINATE Laminate Peeling | CD-DELAM |
| CF-SWELL Swollen Board | CD-SWELL |
| CF-CHIP Chipped Board | PD-CHIP |
| CF-SCRATCH Scratched Surface | SF-SCRATCH |
| CF-LOOSE Loose Structure | AF-LOOSEFIT |
| CF-BROKEN Broken Component | PD-BROKEN |
| _Keep:_ CF-SHELF Shelf Damage | |
| **Floor / Tile / Stone (`FL`)** | |
| FL-CHIP Chipped Tile / Flooring | PD-CHIP |
| FL-SCRATCH Flooring Scratched | SF-SCRATCH |
| FL-STAIN Flooring Stained | SF-STAIN |
| FL-WARP Flooring Warped | PD-WARP |
| FL-HOLLOW Hollow Tile | CD-HOLLOW |
| FL-GAP Flooring Gap | CD-GAP |
| FL-UNEVEN Uneven Floor | AF-UNEVEN |
| FL-CRACK Cracked Tile / Flooring | CD-HAIRLINE / CD-OPENCRACK |
| _Keep:_ FL-LOOSE, FL-LIFT, FL-DISPLACE, FL-GROUT | |
| **Glass / Mirror (`GM`)** | |
| GM-CHIP Chipped Glass | PD-CHIP |
| GM-BROKEN Broken Glass | PD-BROKEN |
| GM-SCRATCH Scratched Glass | SF-SCRATCH |
| GM-STAIN Stained Glass | SF-STAIN |
| _Keep:_ GM-CRACK, GM-FOG, GM-LOOSE, GM-SEAL, GM-MIRROR-DAMAGE, GM-MIRROR-DISCOLOR | |
| **Sanitary Fittings (`SN`)** | |
| SN-TOILET-LOOSE Toilet Bowl Loose | PL-FIXTURELOOSE |
| SN-BASIN-LOOSE Basin Loose | PL-FIXTURELOOSE |
| SN-TAP-LOOSE Tap Loose | PL-FIXTURELOOSE |
| SN-SEAL Silicone / Seal Failure | WM-SEALFAIL |
| SN-LEAK Sanitary Fixture Leak | WM-LEAK |
| _Keep:_ SN-TOILET-CRACK, SN-BASIN-CRACK, SN-SEAT-BROKEN, SN-SEAT-LOOSE, SN-SHOWER-FAULT, SN-HOSE-FAULT, SN-HOLDER | |
| **Curtain / Blind (`CB`)** | |
| CB-DIRTY Dirty | CL-DIRTY |
| CB-STAIN Stained | CL-STAIN |
| CB-TORN Torn | PD-TORN |
| CB-RAIL Rail Fault | HF-RAIL-FAULT |
| CB-STUCK Stuck | FO-STUCK |
| CB-MISALIGN Misaligned | AF-MISALIGN |
| _Keep:_ CB-HOOKMISS, CB-ROD, CB-CHAIN, CB-MOTOR, CB-FABRIC | |

### Part 2 — Duplicates between general categories

| Remove | Use instead | Why |
| --- | --- | --- |
| AP-NOTWORK, LT-NOTWORK | FO-NOTWORK | Item says it's an appliance or a light |
| AP-PARTIAL | FO-PARTIAL | |
| AP-NOPOWER | EL-NOPOWER | |
| AP-CABLE, AP-PLUG | EL-CABLEDMG, EL-PLUGDMG | |
| AP-SEAL | HF-SEAL-DMG | |
| AP-INTERMIT, LT-INTERMIT | FO-INTERMIT | |
| AP-DISPLAY, AC-DISPLAY | FO-DISPLAY | |
| AP-CONTROL | FO-CONTROL | |
| LT-SWITCH Lighting Switch Fault | EL-SWITCHFAIL | Item is the Switch |
| AC-NOISE, AP-NOISE | NV-NOISE | |
| AC-VIBRATE, AP-VIBRATE | NV-VIBRATE | |
| AC-ODOUR, AP-ODOUR | OD-UNKNOWN or the specific OD code | |
| PL-DRAINODOUR | OD-DRAIN | |
| AC-LEAK, AP-LEAK | WM-LEAK | |
| AC-CONDENSE | WM-CONDENSE | |
| PL-TAPDRIP | WM-DRIP | Item is the Tap |
| PL-TAPLEAK | WM-LEAK | Item is the Tap |
| AC-REMOTEMISS | MI-REMOTE | |
| MI-BULB | LT-BULBMISS | |
| MI-SEAL | HF-SEAL-MISSING | |
| MI-FASTENER | HF-SCREW-MISSING | |
| MI-COVER, MI-CAP, EL-COVERMISS, LT-COVERMISS | HF-COVER-MISSING | Item says what the cover belongs to |
| AP-ACCESSMISS | MI-ACCESSORY | |
| AP-COMPMISS | MI-COMPONENT | |
| SF-RESIDUE Adhesive Residue | CL-ADHESIVE | Same name, two codes |
| EL-BURN Burn Mark | SF-BURN | Item (Socket, Switch) keeps the electrical context |

### Part 3 — Questions for the Dictionary owner

1. **Codes that imply a cause.** Home Check records observable facts, and deciding *why* something happened is close to the landlord/tenant responsibility question, which is a non-goal. These codes assert a cause, not just what is seen:
   - `WD` Wear & Deterioration (e.g. WD-FADED "Faded from Age", WD-LOOSE "Loose Due to Wear") — judges fair wear and tear.
   - WM-SWELL "Moisture Swelling", WM-WARP "Moisture Warping" — duplicate CD-SWELL and PD-WARP plus a cause.
   - `IW` Installation & Workmanship (e.g. IW-MISALIGN vs AF-MISALIGN, IW-UNEVEN vs AF-UNEVEN) — asserts poor workmanship.
   - WM-WATERPROOF "Suspected Waterproofing Failure", MB-DAMP "Damp-Related Growth".
   
   Suggestion: replace cause-asserting codes with their observable equivalent (e.g. WD-FADED → SF-FADE, WM-SWELL → CD-SWELL) and keep cause out of Home Check.
2. **Stains:** SF-STAIN vs CL-STAIN. Suggested definitions: SF-STAIN = permanent mark in the surface; CL-STAIN = removable by cleaning. Or merge into one.
3. **Gaps:** AF-GAP (fit), CD-GAP (separation) and IW-GAP (exposed gap) overlap. Suggest keeping AF-GAP and CD-JOINTSEP and removing CD-GAP and IW-GAP.
4. **Cleanliness:** CL-INTERIOR, CL-EXTERIOR and CL-CLEANREQ add little over CL-DIRTY once the Item is known. Suggest removing them.
