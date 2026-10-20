# UI audit issue log

Status: open

One row per issue. Scored issues feed the priority ranking. Add an issue ID wherever it appears in a ticket.

## Legend

**Severity (0–4)**: 0 cosmetic only · 1 minor friction · 2 slows the task · 3 blocks or misleads · 4 data loss, wrong record, or unusable for a user group.

**Heuristic**: Nielsen H1 visibility of status · H2 match with the real world · H3 user control and freedom · H4 consistency · H5 error prevention · H6 recognition over recall · H7 flexibility · H8 minimalist design · H9 error recovery · H10 help. Plus A11Y (accessibility) and COPY.

**Fix type**: copy · layout · flow (needs approval) · component · token.

**Priority**: frequency × severity ÷ effort. Filled in during the ranking step.

## Issues

| ID | Screen | Flow | Element | Observation | Heuristic | Sev | Evidence | Fix type | Effort (S/M/L) | Priority | Status |
|----|--------|------|---------|-------------|-----------|-----|----------|----------|----------------|----------|--------|
| UX-001 | | | | | | | `screens/` | | | | open |

## Phase 2 pattern cards

Written from the inspiration screenshots, one per pattern. Keep them out of this table.

| Pattern | Solves | Keep | Drop | Open question |
|---------|--------|------|------|---------------|
| Guided one-question-per-screen with segmented progress bar and fixed Back/Next footer | Start Inspection setup; Add Area / Add Item forms | One question per screen; progress bar shows position; Back on the left, primary action on the right within thumb reach; primary action stays disabled until the answer exists | Flows of 9+ screens with no sense of how many remain; underlined text as the only Back target | Should Add Item stay on one screen, or does each field need its own step? |
| Persistent exit and help control in the top bar | Start Inspection (leave and resume); every full-screen step | Keep a Save & exit control on every step so a half-finished Inspection can be parked and resumed; help stays one tap away | Avatar-plus-"Questions?" pill with a personal photo; top corners sit out of thumb reach one-handed | Do drafts autosave, making exit reassurance only? Should exit move to the bottom for one-handed use? |
| Step intro card and overview of steps | Start Inspection and first-run onboarding; start of each phase | One sentence on what the phase asks, with the phase number; a short list of the steps before the first one | Large illustrations filling the top half of the screen; a closing CTA that repeats the overview | Does each Area type need an intro, or only the first run? |
| Icon tile grid, single or multi-select | Add Area / Add Item type picker; Item feature checklist (e.g. Smoke alarm, Oven) | Two-column tiles with icon and label; selected tile gets a heavy outline and light fill; about eight tiles visible without scrolling | Tiles that push the Next button out of view; thin line icons at small sizes | How many Area and Item types exist, and are they fixed or user-defined? |
| Chip multi-select with a cap | Defect picker tags (e.g. Cracked, Stained, Damp) | Wrapping chips; selected state shown by outline; helper text states the limit | A two-tag cap as a rule; an icon on every chip, which slows scanning | Should a Defect ever be capped at a few tags, or take any number? |
| Stepper for counts | Add Item counts (e.g. keys, light fittings) | Large round plus and minus buttons (44 pt or more); value between them; one row per number | Stepper for big numbers, where typed entry is faster | Which counts matter for a report, and should typed entry replace the stepper? |
| Text field with live counter and prompt | Notes on an Item or Defect; Area names | Prompt visible above the field; counter that shows the limit; field grows to fill the screen | A fixed 500-character box for a quick note; a long example in the placeholder | What is the maximum length of a Defect note, and can it be dictated one-handed? |
| Yes/no checklist with checkboxes | Start Inspection safety or hazard checks (e.g. smoke alarm present, gas certificate seen) | Checkbox at the right; unchecked by default; short label per row; one info icon for the whole question | Legal footer copy stacked under the checklist | Which yes/no checks must be recorded per property, and do any need a photo? |
| Search-as-you-type address with fallback | Start Inspection address entry | One search field; suggestions update as you type; "Use the address entered" always shown below the results | Results from other countries and unrelated road names for a generic query; no manual route when results are poor | Must address entry work offline or with poor signal inside a property? |
| Prefilled confirm form with sticky confirm button | Start Inspection address confirm | Fields prefilled from the chosen result; every field has a visible label, not only a placeholder; optional fields marked "(if applicable)"; one full-width confirm button pinned at the bottom | Search text left in the street field after a country change (INS-10 to INS-12); a privacy toggle on an inspection form | Which address fields does a report need, and is a country picker needed for a single-country tool? |
| Wheel picker for a long list | Country picker; any long Area or Item list | Done button closes the picker; selected value shown in a highlighted band | A wheel for a long list; slow and hard to use one-handed | Will any picker exceed about 20 items? If so, use search instead. |
| Drag-to-adjust pin on map | Start Inspection location; Defect location on a plan | One question per screen; pin fixed at centre and the map moves under it; a short hint says how to adjust | Map dependence for an address the inspector already has; a building-shaped pin | Does an Inspection need coordinates at all, or only the typed address? |
| Two-path source sheet (library or camera) | Evidence capture: attach a photo from the library or the camera | Two large rows, each one tap; camera is an equal first-class option | Extra sheet between the Item and the camera, if it adds a tap | Should the camera open straight from the Item screen? |
| Multi-select photo picker with count and footer | Evidence capture: attach several photos to one Item | Running count in the header ("5 photos selected"); check badge on each selected tile; footer says what is needed and updates | A minimum count of five for evidence; thumbnails too small to tap one-handed | Is there a minimum photo count per Defect, or should the picker be free-form? |
| Upload progress with counter | Evidence capture: upload status | Explicit "0 of 5 uploaded" counter; per-item status | "Magically arranging" copy that hides what the app is doing; a full-screen block during upload | With no signal, is upload queued, retried, or blocked? |
| Review grid with per-photo menu and cover | Evidence review before saving; choosing an Item's main photo | Per-photo "..." menu as the one-handed route to reorder, set cover or delete; first photo labelled | Drag-only reordering; an automatically picked cover the inspector did not choose | Which photo is the main one for an Item, and does the inspector choose it? |
| Read-only preview before publish | Review before issuing a report (Complete and lock, Export and share) | Summary shown as the recipient will see it; sections for details, items and location; opened from the review step | Consumer badges such as a "New" star; host avatar and rating language | Who receives the report, and do they see the same fields as this preview? |
| Next-steps list after completion | Post-finish actions (export, start Move-out); Inspection list cards | Each next step is one line with an icon; reachable from the home screen | Horizontal card carousel with arrows (cards off-screen, hard one-handed); decorative photo backgrounds | Which next steps follow a Move-in or Move-out, and which can be done on the phone? |

**Which screens show each pattern** (numbers match the renamed files in `.scratch/ui-audit/inspiration/`):

- Guided one-question-per-screen: INS-03, INS-04, INS-05, INS-06, INS-07, INS-15, INS-16, INS-17, INS-18, INS-19, INS-22, INS-23, INS-24, INS-25, INS-26, INS-27, INS-28, INS-29, INS-30, INS-31, INS-32, INS-33
- Persistent exit and help control in the top bar: INS-02, INS-03, INS-04, INS-05, INS-06, INS-15, INS-16, INS-17, INS-18, INS-19, INS-22, INS-23, INS-24, INS-25, INS-26, INS-27, INS-28, INS-29, INS-30, INS-31, INS-32, INS-33
- Step intro card and overview: INS-02, INS-03, INS-17, INS-28
- Icon tile grid, single or multi-select: INS-04, INS-05, INS-18
- Chip multi-select with a cap: INS-25, INS-26
- Stepper for counts: INS-16
- Text field with live counter and prompt: INS-23, INS-24, INS-27
- Yes/no checklist with checkboxes: INS-31
- Search-as-you-type address with fallback: INS-07, INS-08, INS-09
- Prefilled confirm form with sticky confirm button: INS-10, INS-11, INS-12, INS-13, INS-14
- Wheel picker for a long list: INS-11
- Drag-to-adjust pin on map: INS-15
- Two-path source sheet (library or camera): INS-19
- Multi-select photo picker with count and footer: INS-20
- Upload progress with counter: INS-21
- Review grid with per-photo menu and cover: INS-22
- Read-only preview before publish: INS-32, INS-34, INS-35
- Next-steps list after completion: INS-33, INS-38

Not carded: INS-01 (earnings estimate), INS-36 (CEO video sign-off) and INS-37 (mode-switch transition). These are marketing or mode-change moments with no transferable pattern.
