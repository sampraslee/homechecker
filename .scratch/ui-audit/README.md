# UI/UX audit: Home Check Prototype

Branch: `design/audit`

This folder holds the audit of the existing app and the redesign plan that comes from it. It follows the local-markdown tracker in `docs/agents/issue-tracker.md`.

## Files

- `inventory.md`: screens, shared components, flows, and the task walkthrough log.
- `issue-log.md`: one row per UX issue, scored and prioritised.
- `screens/`: screenshots named `<screen-id>--<state>.png`, e.g. `S-05--ai-suggestion-pending.png`.
- `inspiration/` (create when needed): the inspiration screenshots, each named `INS-NN-<slug>.png`, with pattern cards in `issue-log.md`.

## Order of work

1. Fill `inventory.md`: confirm the screen list against the running app.
2. Capture screenshots for every state listed in `inventory.md`.
3. Run the walkthrough tasks T-01 to T-06 and record them.
4. Score each screen for heuristics, accessibility, consistency and copy. Add each finding to `issue-log.md`.
5. Rank by priority. The top 10 become the redesign scope.
6. Write pattern cards from the inspiration screenshots.
7. Hand over to `/grill-with-docs` for the design goals, then `/prototype` for open design questions.

## Design goals (settled in grilling)

- **Users:** standing Inspectors on their own iOS or Android phone, one-handed, often with poor or no signal, with interruptions. Rizurf staff reviewing data later is out of scope.
- **Primary goal:** less time per Inspection. **Guardrail:** no increase in mis-filed Defects (wrong Area, wrong Item, duplicates). Missed Defects and AI confirmation rate are tracked, not targeted.
- **Order of work:** flow changes first, each approved on its own (see `flow-proposals/`). The visual pass starts only after the approved flow changes are settled.
- **Visual:** Rizurf brand tokens exactly. Inspiration shapes layout and interaction patterns only, never colour, type or logo.
- **Inspiration:** 37 Airbnb "Listing a space" screenshots, grouped into flow steps with one pattern card per distinct pattern in `issue-log.md`. Liked: the guided one-step-per-screen flow, simple design, spacing, icons, concise copy.
- **Offline and AI state:** a quiet status line in the Band or Dock (e.g. "Offline: AI suggestions will come when you're back online"). It never blocks recording. AI suggestions queue silently and appear in the Defect picker when they arrive.

## Flow proposals

- `flow-proposals/FP-01-guided-start-inspection.md`: approved with changes. Address steps merged into three screens, Review step for every path, Move-in / Move-out placement left open until the prototype.

## Rules

- Nothing is scored from memory. Each issue points at a screenshot.
- Changes to a user flow need the user's explicit yes first.
- Brand tokens come from the rizurf brand: teal primary (deep `#0E6F7D` for buttons), blue for AI, slate neutrals, system font.
