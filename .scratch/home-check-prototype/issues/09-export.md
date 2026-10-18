# 09: Export

**What to build:** From any Inspection, Draft or Completed, the Inspector exports a .zip and the phone's share menu opens. The zip holds `inspection.xlsx` and a `media/` folder of every original photo and video, named by Area, Item and sequence. The workbook has a Defects sheet (one row per Defect, embedded thumbnail of the first linked photo, relative links to all linked media) and an Inspection sheet. The Inspection records when it was last exported. See the spec: Export format.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [ ] Core operation: Inspection id → zip bytes (ExcelJS + JSZip)
- [ ] `media/` contains every original photo and video with stable, readable names
- [ ] Defects sheet columns: Unit address, Inspection type, Inspection date, Inspector, Area, Item (with short name), Defect Category, Defect Type code, Defect Type name, note, embedded thumbnail, links to all linked media
- [ ] Inspection sheet: type, address, Inspector, started at, completed at, duration, Dictionary version
- [ ] Every hyperlink is relative and resolves to a file in `media/` after unzipping
- [ ] UI hands the zip to the Web Share API, falling back to a download
- [ ] Works for Draft and Completed Inspections; records last-exported time, shown on the Inspection
- [ ] Core tests unzip the bytes, read the workbook back with ExcelJS, and assert rows, embedded image presence and that every link resolves
