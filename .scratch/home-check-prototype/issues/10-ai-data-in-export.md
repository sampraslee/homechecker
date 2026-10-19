# 10: AI data in the export

**What to build:** The export shows how the AI performed. The Defects sheet gains source (manual / AI-suggested) and AI confidence columns, and a new AI Suggestions sheet lists every suggestion with its photo, code, confidence and outcome — so Rizurf can measure confirm / correct / reject rates. See the spec: Export format.

**Blocked by:** 08, 09

**Status:** ready-for-agent

- [x] Defects sheet adds source and AI confidence (blank for manual Defects)
- [x] AI Suggestions sheet: Area, Item, photo link, suggested code, confidence, outcome (confirmed / corrected / rejected / not reviewed), corrected code
- [x] Photo links resolve to files in `media/`
- [x] Core tests assert both sheets for a mix of manual, confirmed, corrected, rejected and unreviewed cases
