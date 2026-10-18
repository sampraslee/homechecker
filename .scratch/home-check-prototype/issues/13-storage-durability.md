# 13: Keeping data safe on the phone

**What to build:** Because data lives only on the phone (ADR 0004), the app asks the browser to keep its storage permanently and shows the result in settings. After an Inspection is Completed the Inspector is prompted to export it, and the Inspection list flags Inspections that have never been exported. See the spec: Storage durability.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] On first launch, request persistent storage; settings show granted or refused, with advice to export often if refused
- [ ] After completing an Inspection, prompt to export it now
- [ ] Inspection list flags Inspections never exported, and shows last-exported time otherwise
- [ ] Core tests cover the "never exported" flag via the Environment and Storage fakes
