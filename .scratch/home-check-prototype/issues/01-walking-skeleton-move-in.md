# 01: Walking skeleton — create a Move-in Inspection and see it listed

**What to build:** An Inspector installs the PWA, sets their name, starts a Move-in Inspection by entering a Malaysian Unit address, and sees it in their Inspection list — all working offline after install. This lays down the stack (React + TypeScript + Vite + vite-plugin-pwa, Dexie, Vitest + fake-indexeddb) and the Home Check core with its Storage and Environment adapters, so every later ticket follows the same pattern. See the spec: Architecture, Domain rules, Data shapes (Unit address).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] App builds, is installable as a PWA, and launches with no network after first load
- [ ] Home Check core is framework-free TypeScript; the UI calls only core operations
- [ ] Storage adapter (Dexie) and Environment adapter (time, online state) are injected into the core; tests use fakes
- [ ] Settings: Inspector sets their name; starting an Inspection without a name prompts for it
- [ ] Start Move-in with fields: unit number, building name (optional), street, area / Taman (optional), postcode, city, state
- [ ] Postcode must be 5 digits; state is chosen from the 13 states and 3 Federal Territories; required fields enforced
- [ ] Inspection records type Move-in, status Draft, Inspector name and started-at time; no tenant fields exist
- [ ] Inspection list shows type, address, date and Draft/Completed status, and opens an Inspection
- [ ] Vitest runs core tests against fake-indexeddb; tests cover address validation and Inspection creation through core operations only
