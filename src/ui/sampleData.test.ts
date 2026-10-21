import { describe, expect, test } from "vitest";
import { bundledReferenceData } from "../referenceData";
import { createTestHomeCheck } from "../testing/homeCheck";
import { loadSampleInspections } from "./sampleData";

describe("the sample Inspections", () => {
  test("load against the bundled reference data: a Draft Move-in, a Completed Move-in and a linked Move-out", async () => {
    const { homeCheck } = createTestHomeCheck(bundledReferenceData);

    await loadSampleInspections(homeCheck);

    const list = await homeCheck.listInspections();
    expect(list.map(({ type, status, defectCount }) => ({ type, status, defectCount })).sort((a, b) => a.defectCount - b.defectCount)).toEqual([
      { type: "move-out", status: "draft", defectCount: 1 },
      { type: "move-in", status: "completed", defectCount: 2 },
      { type: "move-in", status: "draft", defectCount: 3 },
    ]);
    const draft = list.find((inspection) => inspection.type === "move-in" && inspection.status === "draft")!;
    expect(await homeCheck.inspectionTotals(draft.id)).toMatchObject({ areas: 3, areasCompleted: 1, defectsWithoutSeverity: 0 });
  });

  test("keeps the Inspector's name when one is already saved", async () => {
    const { homeCheck } = createTestHomeCheck(bundledReferenceData);
    await homeCheck.setInspectorName("Farid");

    await loadSampleInspections(homeCheck);

    expect((await homeCheck.getSettings()).inspectorName).toBe("Farid");
    expect((await homeCheck.listInspections())[0].address.unitNumber).toBeDefined();
  });
});
