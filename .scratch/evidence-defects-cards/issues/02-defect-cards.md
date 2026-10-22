# 02: Defect cards replace the Evidence list

**What to build:** The Item screen drops the Photo, Video and Note buttons and the Evidence list, and lists Defects as cards in the Inspections card design, with the AI suggested or manual meta line and the Severity chip. Amend ADR 0003, ADR 0006 and the glossary: Evidence with no Defect can no longer be captured. See the spec: Item screen.

**Blocked by:** 01

**Status:** resolved

- [x] Photo, Video and Note buttons are gone; Record a Defect is the only way to add Evidence
- [x] Each Defect shows as a card: first photo or placeholder, Severity chip on it, Defect Type title, meta line, Edit link
- [x] The meta line says AI suggested with the highest confirmed confidence, or Added manually; corrected counts as manual
- [x] The card opens the editor; on a Completed Inspection the link reads View and the editor is read-only
- [x] Cards are oldest first; the header count shows Defects only; the empty state uses the new wording
- [x] Evidence with no Defect still appears in the export
- [x] ADR 0003, ADR 0006 and GLOSSARY.md are amended
- [x] Tests cover the AI suggested or manual rule
- [x] Checked at phone width in the browser preview
