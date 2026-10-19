# 09: Export

**What to build:** From any Inspection, Draft or Completed, the Inspector exports a .zip and the phone's share menu opens. The zip holds `inspection.xlsx` and a `media/` folder of every original photo and video, named by Area, Item and sequence. The workbook has a Defects sheet (one row per Defect, embedded thumbnail of the first linked photo, relative links to all linked media) and an Inspection sheet. The Inspection records when it was last exported. See the spec: Export format.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [x] Core operation: Inspection id → zip bytes (ExcelJS + JSZip)
- [x] `media/` contains every original photo and video with stable, readable names
- [x] Defects sheet columns: Unit address, Inspection type, Inspection date, Inspector, Area, Item (with short name), Defect Category, Defect Type code, Defect Type name, note, embedded thumbnail, links to all linked media
- [x] Inspection sheet: type, address, Inspector, started at, completed at, duration, Dictionary version
- [x] Every hyperlink is relative and resolves to a file in `media/` after unzipping
- [x] UI hands the zip to the Web Share API, falling back to a download
- [x] Works for Draft and Completed Inspections; records last-exported time, shown on the Inspection
- [x] Core tests unzip the bytes, read the workbook back with ExcelJS, and assert rows, embedded image presence and that every link resolves

## Notes from implementation

- Media files are flat in `media/`, named `<area#>-<area>-<item#>-<item>-<seq#>.<ext>` (e.g. `01-bedroom-01-wardrobe-left-01.jpg`); numbers keep names unique even when a name has no ASCII letters. The extension comes from the original's media type.
- Times in the workbook are in Malaysia time (Asia/Kuala_Lumpur), whichever phone exports.
- A "Linked notes" column holds the text of note Evidence linked to the Defect, so it isn't lost from the export.
- The last-exported time is recorded when the zip is built, before the share menu opens; a cancelled share still counts.
- Safari refuses the share menu after the zip takes a while to build; the screen then offers a "Share export" button for a fresh tap. Chrome on Android (checked on a Galaxy A02, Android 11, Chrome 155) says `canShare` yes for the zip, then refuses `share` with "NotAllowedError: Permission denied" even on a fresh tap, so a refusal while the tap is still recent, or on the second tap, downloads instead. Not confirmed whether Chrome refused the `.zip` type or the dev server's self-signed certificate; recheck once hosted (ticket 14).
- ExcelJS and JSZip load only when exporting (own chunk, precached for offline use).
