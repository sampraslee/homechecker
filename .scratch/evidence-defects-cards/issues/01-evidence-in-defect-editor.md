# 01: Open and delete Evidence in the Defect editor

**What to build:** Each photo, video or note linked to a Defect can be opened and deleted from the Defect editor, with the existing consequences confirmation. This comes first because ticket 02 removes the Evidence list, where deletion lives today. See the spec: Defect editor.

**Blocked by:** none

**Status:** resolved

- [x] A linked photo or video opens in the viewer from the editor
- [x] A linked note opens for editing from the editor
- [x] Deleting Evidence shows the existing consequences confirmation and behaves as it does today
- [ ] On a Completed Inspection the editor shows the Evidence but offers no delete or edit (coded, but the editor is not reachable on a Completed Inspection until ticket 02; check there)
- [x] Tests cover delete from the editor (core already tests the cascade; the project has no component test setup)
- [x] Checked at phone width in the browser preview
