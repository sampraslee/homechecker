import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";
import { assignDefectType } from "./assignDefectType";

const scratched = { code: "SF-SCRATCH", name: "Scratched", noteRequired: false };

async function wardrobeWithTwoPhotos() {
  const setup = await createTestHomeCheckWithItem();
  const photo = async (text: string) => expectOk(await setup.homeCheck.addPhoto(setup.itemId, new Blob([text]))).evidence.id;
  return { ...setup, first: await photo("one"), second: await photo("two") };
}

describe("assigning a Defect Type to a piece of Evidence", () => {
  test("makes a Defect with that Evidence", async () => {
    const { homeCheck, itemId, first } = await wardrobeWithTwoPhotos();

    const assigned = await assignDefectType(homeCheck, itemId, scratched, first);

    expect(assigned.kind).toBe("added");
    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ defectTypeCode: "SF-SCRATCH", evidenceIds: [first] }]);
  });

  test("adds the Evidence to the Defect the Item already has for that Defect Type", async () => {
    const { homeCheck, itemId, first, second } = await wardrobeWithTwoPhotos();
    await assignDefectType(homeCheck, itemId, scratched, first);

    const assigned = await assignDefectType(homeCheck, itemId, scratched, second);

    expect(assigned.kind).toBe("linked");
    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ evidenceIds: [first, second] }]);
  });

  test("changes nothing when the Evidence is already on that Defect", async () => {
    const { homeCheck, itemId, first } = await wardrobeWithTwoPhotos();
    await assignDefectType(homeCheck, itemId, scratched, first);

    const assigned = await assignDefectType(homeCheck, itemId, scratched, first);

    expect(assigned.kind).toBe("already-linked");
    expect(await homeCheck.listDefects(itemId)).toHaveLength(1);
  });

  test("asks for a note first when the Defect Type needs one", async () => {
    const { homeCheck, itemId, first } = await wardrobeWithTwoPhotos();

    const assigned = await assignDefectType(homeCheck, itemId, { code: "OT-OTHER", name: "Other", noteRequired: true }, first);

    expect(assigned.kind).toBe("needs-note");
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });

  test("lets one piece of Evidence take several Defect Types", async () => {
    const { homeCheck, itemId, first } = await wardrobeWithTwoPhotos();

    await assignDefectType(homeCheck, itemId, scratched, first);
    await assignDefectType(homeCheck, itemId, { code: "CF-HINGE", name: "Hinge Fault", noteRequired: false }, first);

    expect((await homeCheck.listDefects(itemId)).map((defect) => defect.defectTypeCode)).toEqual(["SF-SCRATCH", "CF-HINGE"]);
  });
});
