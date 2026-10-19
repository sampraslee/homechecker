# 12: Address suggestions

**What to build:** While typing a Unit address, the Inspector sees addresses already entered in earlier Inspections on this phone and can pick one to fill every field, so the same Unit isn't recorded with different spellings. See the spec: Core operations (address suggestions).

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Core operation returns distinct previously entered addresses matching what's typed (unit number, building, street or postcode)
- [x] Picking a suggestion fills all address fields; the Inspector can still edit them
- [x] Works offline; only data on this phone is used
- [x] Core tests cover matching and de-duplication
