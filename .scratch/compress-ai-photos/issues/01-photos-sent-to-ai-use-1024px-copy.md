# 01: Photos sent to the AI use a 1024px Evidence Copy

**What to build:** A newly taken photo's Evidence Copy, the version sent to the AI for analysis, is resized to 1024 pixels on its longest edge instead of 2048. The Inspector's photos are still kept at full resolution, and the export, videos and the AI's answers are unchanged. The size rule is a pure function with its own unit tests, so it can be checked without a browser. See the spec: Compress photos for AI analysis.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A newly taken photo's Evidence Copy has a longest edge of 1024 pixels, with JPEG quality still 0.82
- [x] A photo already within the limit is not enlarged
- [x] The size rule is a pure function, with unit tests for landscape, portrait, square, exactly at the limit, and smaller than the limit
- [x] The AI receives the Evidence Copy and never the original (existing test kept, and extended if needed)
- [x] Photos processed before this change keep their 2048px Evidence Copy; nothing is regenerated
- [x] Each photo's original is stored exactly as recorded
- [x] The export zip contains each photo's and video's original and no Evidence Copies; the spreadsheet is unchanged (regression tests)
- [x] Videos are recorded, stored and exported as before, with no compression
- [x] A photo is still kept when its smaller versions can't be made, as before
- [x] The AI request keeps its current shape and answers still come only from the Defect Dictionary
