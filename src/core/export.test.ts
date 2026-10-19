import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithInspection, createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

/** The unzipped export: its workbook read back with ExcelJS, and the zip to look files up in. */
async function unzipExport(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const workbookFile = zip.file("inspection.xlsx");
  if (!workbookFile) throw new Error("no inspection.xlsx in the zip");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await workbookFile.async("arraybuffer"));
  return { zip, workbook };
}

/** A sheet's rows as plain values, header row first. */
function rowsOf(workbook: ExcelJS.Workbook, sheetName: string) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`no ${sheetName} sheet`);
  const rows: unknown[][] = [];
  sheet.eachRow((row) => rows.push((row.values as unknown[]).slice(1)));
  return rows;
}

/** Each image embedded in a sheet: the 1-based row and column of its top-left cell, and its bytes as text. */
function imagesOf(workbook: ExcelJS.Workbook, sheetName: string) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`no ${sheetName} sheet`);
  return sheet.getImages().map((image) => ({
    row: image.range.tl.nativeRow + 1,
    column: image.range.tl.nativeCol + 1,
    content: Buffer.from(workbook.getImage(Number(image.imageId)).buffer as ArrayBuffer).toString(),
  }));
}

describe("exporting an Inspection", () => {
  test("gives a zip whose Inspection sheet describes the Inspection", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithItem();
    environment.setNow(new Date("2026-01-05T11:45:00.000Z"));
    expectOk(await homeCheck.completeInspection(inspectionId));

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    expect(rowsOf(workbook, "Inspection")).toEqual([
      ["Inspection type", "Move-in"],
      ["Unit address", "7, Jalan Kenari 3, 47100 Puchong, Selangor"],
      ["Inspector", "Aisyah"],
      ["Started at", "5 Jan 2026, 17:00"],
      ["Completed at", "5 Jan 2026, 19:45"],
      ["Duration", "2 h 45 min"],
      ["Defect Dictionary version", "test-dictionary-1"],
    ]);
  });

  test("names a Move-out's linked Move-in on the Inspection sheet", async () => {
    const { homeCheck, environment, inspectionId: moveInId } = await createTestHomeCheckWithInspection();
    environment.setNow(new Date("2027-01-04T02:00:00.000Z"));
    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(moveOut.id)).zip);

    expect(rowsOf(workbook, "Inspection")).toEqual([
      ["Inspection type", "Move-out"],
      ["Unit address", "7, Jalan Kenari 3, 47100 Puchong, Selangor"],
      ["Inspector", "Aisyah"],
      ["Started at", "4 Jan 2027, 10:00"],
      ["Completed at"],
      ["Duration"],
      ["Defect Dictionary version", "test-dictionary-1"],
      ["Linked Move-in address", "7, Jalan Kenari 3, 47100 Puchong, Selangor"],
      ["Linked Move-in date", "5 Jan 2026"],
    ]);
  });

  test("says when a Move-out is not linked to a Move-in", async () => {
    const { homeCheck } = await createTestHomeCheckWithInspection();
    const moveOut = expectOk(
      await homeCheck.startMoveOut({
        address: { unitNumber: "9", street: "Jalan Kenari 5", postcode: "47100", city: "Puchong", state: "Selangor" },
      }),
    ).inspection;

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(moveOut.id)).zip);

    expect(rowsOf(workbook, "Inspection").slice(-2)).toEqual([
      ["Linked Move-in address", "Not linked"],
      ["Linked Move-in date"],
    ]);
  });

  test("is named after the Inspection's type, Unit and start date", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();

    const exported = expectOk(await homeCheck.exportInspection(inspectionId));

    expect(exported.fileName).toBe("home-check-move-in-7-jalan-kenari-3-2026-01-05.zip");
  });

  test("puts every original photo and video in media/, named by Area, Item and sequence", async () => {
    const { homeCheck, inspectionId, areaId, itemId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.renameItem(itemId, "Left"));
    expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"], { type: "image/jpeg" })));
    expectOk(await homeCheck.addNote(itemId, "Smells of damp"));
    expectOk(await homeCheck.addVideo(itemId, new Blob(["door that sticks"], { type: "video/webm;codecs=vp9" }), 8));
    const window = expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window" })).item;
    expectOk(await homeCheck.addPhoto(window.id, new Blob(["cracked pane"], { type: "image/png" })));
    const bathroom = expectOk(await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" })).area;
    const toilet = expectOk(await homeCheck.addItem(bathroom.id, { catalogItemId: "toilet" })).item;
    expectOk(await homeCheck.addVideo(toilet.id, new Blob(["flush fails"], { type: "video/mp4" }), 5));

    const { zip } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    const media = zip.file(/^media\//);
    expect(
      Object.fromEntries(await Promise.all(media.map(async (file) => [file.name, await file.async("string")]))),
    ).toEqual({
      "media/01-bedroom-01-wardrobe-left-01.jpg": "scratched door",
      "media/01-bedroom-01-wardrobe-left-02.webm": "door that sticks",
      "media/01-bedroom-02-window-01.png": "cracked pane",
      "media/02-bathroom-01-toilet-01.mp4": "flush fails",
    });
  });

  test("has a Defects sheet with one row per Defect, linking each to its media", async () => {
    const { homeCheck, inspectionId, itemId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.renameItem(itemId, "Left"));
    const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"], { type: "image/jpeg" }))).evidence;
    const note = expectOk(await homeCheck.addNote(itemId, "Worse near the handle")).evidence;
    const video = expectOk(await homeCheck.addVideo(itemId, new Blob(["door swings"], { type: "video/mp4" }), 8)).evidence;
    expectOk(
      await homeCheck.addDefect(itemId, {
        defectTypeCode: "SF-SCRATCH",
        note: "Deep",
        evidenceIds: [photo.id, note.id, video.id],
      }),
    );
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE" }));

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    const leading = ["7, Jalan Kenari 3, 47100 Puchong, Selangor", "Move-in", "5 Jan 2026", "Aisyah", "Bedroom", "Wardrobe – Left"];
    expect(rowsOf(workbook, "Defects")).toEqual([
      [
        "Unit address",
        "Inspection type",
        "Inspection date",
        "Inspector",
        "Area",
        "Item",
        "Defect Category",
        "Defect Type code",
        "Defect Type name",
        "Note",
        "Linked notes",
        "Source",
        "AI confidence",
        "Photo",
        "Media 1",
        "Media 2",
      ],
      [
        ...leading,
        "Surface & Finish",
        "SF-SCRATCH",
        "Scratched",
        "Deep",
        "Worse near the handle",
        "Manual",
        undefined,
        undefined,
        { text: "01-bedroom-01-wardrobe-left-01.jpg", hyperlink: "media/01-bedroom-01-wardrobe-left-01.jpg" },
        { text: "01-bedroom-01-wardrobe-left-02.mp4", hyperlink: "media/01-bedroom-01-wardrobe-left-02.mp4" },
      ],
      [...leading, "Cabinet / Furniture Specific", "CF-HINGE", "Hinge Fault", undefined, undefined, "Manual"],
    ]);
  });

  test("marks each Defect as manual or AI-suggested, with the AI's confidence for an AI-suggested one", async () => {
    const { homeCheck, inspectionId, itemId, aiClient } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE" }));
    aiClient.answer([{ code: "SF-SCRATCH", confidence: "Medium" }]);
    expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"], { type: "image/jpeg" })));
    await homeCheck.processAiQueue();
    aiClient.answer([{ code: "SF-STAIN", confidence: "Low" }]);
    expectOk(await homeCheck.addPhoto(itemId, new Blob(["marked door"], { type: "image/jpeg" })));
    await homeCheck.processAiQueue();
    aiClient.answer([{ code: "CF-HINGE", confidence: "High" }]);
    expectOk(await homeCheck.addPhoto(itemId, new Blob(["drooping door"], { type: "image/jpeg" })));
    await homeCheck.processAiQueue();
    const [scratch, stain, hinge] = await homeCheck.listAiSuggestions(itemId);
    expectOk(await homeCheck.confirmAiSuggestion(scratch.id));
    expectOk(await homeCheck.correctAiSuggestion(stain.id, { defectTypeCode: "GM-CRACK" }));
    // Confirmed onto the hand-added hinge Defect, which stays manual.
    expectOk(await homeCheck.confirmAiSuggestion(hinge.id));

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    const sourceAndConfidence = rowsOf(workbook, "Defects").map((row) => [row[7], row[11], row[12]]);
    expect(sourceAndConfidence).toEqual([
      ["Defect Type code", "Source", "AI confidence"],
      ["CF-HINGE", "Manual", undefined],
      ["SF-SCRATCH", "AI-suggested", "Medium"],
      ["GM-CRACK", "AI-suggested", "Low"],
    ]);
  });

  test("has an AI Suggestions sheet listing every suggestion with its photo, confidence and outcome", async () => {
    const { homeCheck, inspectionId, areaId, itemId, aiClient } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-STAIN" }));
    aiClient.answer([
      { code: "SF-SCRATCH", confidence: "High" },
      { code: "CF-HINGE", confidence: "Medium" },
      { code: "SF-STAIN", confidence: "Low" },
    ]);
    expectOk(await homeCheck.addPhoto(itemId, new Blob(["wardrobe door"], { type: "image/jpeg" })));
    await homeCheck.processAiQueue();
    const window = expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window" })).item;
    aiClient.answer([{ code: "GM-CRACK", confidence: "Low" }]);
    expectOk(await homeCheck.addPhoto(window.id, new Blob(["window pane"], { type: "image/jpeg" })));
    await homeCheck.processAiQueue();
    const [scratch, hinge, stain] = await homeCheck.listAiSuggestions(itemId);
    expectOk(await homeCheck.confirmAiSuggestion(scratch.id));
    expectOk(await homeCheck.correctAiSuggestion(hinge.id, { defectTypeCode: "GM-CRACK" }));
    expectOk(await homeCheck.rejectAiSuggestion(stain.id));

    const { zip, workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    const wardrobePhoto = { text: "01-bedroom-01-wardrobe-01.jpg", hyperlink: "media/01-bedroom-01-wardrobe-01.jpg" };
    const windowPhoto = { text: "01-bedroom-02-window-01.jpg", hyperlink: "media/01-bedroom-02-window-01.jpg" };
    expect(rowsOf(workbook, "AI Suggestions")).toEqual([
      ["Area", "Item", "Photo", "Suggested Defect Type code", "Confidence", "Outcome", "Corrected Defect Type code"],
      ["Bedroom", "Wardrobe", wardrobePhoto, "SF-SCRATCH", "High", "Confirmed"],
      ["Bedroom", "Wardrobe", wardrobePhoto, "CF-HINGE", "Medium", "Corrected", "GM-CRACK"],
      ["Bedroom", "Wardrobe", wardrobePhoto, "SF-STAIN", "Low", "Rejected"],
      ["Bedroom", "Window", windowPhoto, "GM-CRACK", "Low", "Not reviewed"],
    ]);
    expect(zip.file(wardrobePhoto.hyperlink)).not.toBeNull();
    expect(zip.file(windowPhoto.hyperlink)).not.toBeNull();
    const sourceAndConfidence = rowsOf(workbook, "Defects").map((row) => [row[7], row[11], row[12]]);
    expect(sourceAndConfidence).toEqual([
      ["Defect Type code", "Source", "AI confidence"],
      ["SF-STAIN", "Manual", undefined],
      ["SF-SCRATCH", "AI-suggested", "High"],
      ["GM-CRACK", "AI-suggested", "Medium"],
    ]);
  });

  test("has an AI Suggestions sheet with only its header when the AI suggested nothing", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    expect(rowsOf(workbook, "AI Suggestions")).toEqual([
      ["Area", "Item", "Photo", "Suggested Defect Type code", "Confidence", "Outcome", "Corrected Defect Type code"],
    ]);
  });

  test("embeds the thumbnail of each Defect's first linked photo in its Photo column", async () => {
    const { homeCheck, inspectionId, areaId, itemId, imageProcessor } = await createTestHomeCheckWithItem();
    const video = expectOk(await homeCheck.addVideo(itemId, new Blob(["door swings"], { type: "video/mp4" }), 8)).evidence;
    const first = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"], { type: "image/jpeg" }))).evidence;
    const second = expectOk(await homeCheck.addPhoto(itemId, new Blob(["close up"], { type: "image/jpeg" }))).evidence;
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [second.id, video.id, first.id] }));
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE", evidenceIds: [video.id] }));
    const window = expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window" })).item;
    imageProcessor.failNext();
    const unprocessed = expectOk(await homeCheck.addPhoto(window.id, new Blob(["cracked pane"], { type: "image/jpeg" }))).evidence;
    expectOk(await homeCheck.addDefect(window.id, { defectTypeCode: "GM-CRACK", evidenceIds: [unprocessed.id] }));

    const { workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    // The window's photo has no thumbnail yet, so its original stands in.
    expect(imagesOf(workbook, "Defects")).toEqual([
      { row: 2, column: 14, content: "thumbnail of scratched door" },
      { row: 4, column: 14, content: "cracked pane" },
    ]);
  });
});

describe("the look of an export's workbook", () => {
  async function exportedWorkbook() {
    const { homeCheck, inspectionId, itemId } = await createTestHomeCheckWithItem();
    const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"], { type: "image/jpeg" }))).evidence;
    expectOk(
      await homeCheck.addDefect(itemId, {
        defectTypeCode: "SF-SCRATCH",
        note: "Long scratches across both doors, deepest near the handle, paint gone down to the board in two places",
        evidenceIds: [photo.id],
      }),
    );
    return (await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip)).workbook;
  }

  function sheet(workbook: ExcelJS.Workbook, name: string) {
    const found = workbook.getWorksheet(name);
    if (!found) throw new Error(`no ${name} sheet`);
    return found;
  }

  test("sets every cell in Inter", async () => {
    const workbook = await exportedWorkbook();

    const fonts = new Set<string | undefined>();
    workbook.eachSheet((each) => each.eachRow((row) => row.eachCell((cell) => fonts.add(cell.font?.name))));

    expect([...fonts]).toEqual(["Inter"]);
  });

  test("gives the Defects header row bold, centred text on #34d3f7, 36 pixels high", async () => {
    const header = sheet(await exportedWorkbook(), "Defects").getRow(1);

    // 36 pixels is 27 points, Excel's unit for row height.
    expect(header.height).toBe(27);
    header.eachCell((cell) => {
      expect(cell.font).toMatchObject({ name: "Inter", bold: true });
      expect(cell.alignment).toMatchObject({ horizontal: "center", vertical: "middle", wrapText: true });
      expect(cell.fill).toMatchObject({ type: "pattern", pattern: "solid", fgColor: { argb: "FF34D3F7" } });
    });
  });

  test("wraps the other cells' text and aligns it to the top", async () => {
    const workbook = await exportedWorkbook();

    for (const [name, firstDataRow] of [["Defects", 2], ["Inspection", 1]] as const) {
      sheet(workbook, name).eachRow((row, rowNumber) => {
        if (rowNumber < firstDataRow) return;
        row.eachCell({ includeEmpty: true }, (cell) => {
          expect(cell.alignment, `${name}!${cell.address}`).toMatchObject({ vertical: "top", wrapText: true });
          expect(cell.font?.bold, `${name}!${cell.address}`).toBeFalsy();
        });
      });
    }
  });

  test("fits each column to its data, up to a limit past which long text wraps", async () => {
    const defects = sheet(await exportedWorkbook(), "Defects");
    const width = (header: string) => {
      let found: number | undefined;
      defects.getRow(1).eachCell((cell, column) => {
        if (cell.value === header) found = defects.getColumn(column).width;
      });
      return found;
    };

    // "Inspection type" (15 characters) is its longest text; the address (42) is the Unit address column's.
    expect(width("Inspection type")).toBeGreaterThanOrEqual(15);
    expect(width("Inspection type")).toBeLessThan(21);
    expect(width("Unit address")).toBeGreaterThanOrEqual(42);
    expect(width("Unit address")).toBeLessThan(52);
    // The 100-character note is capped, and wraps instead.
    expect(width("Note")).toBe(60);
  });
});

/** Every hyperlink in every sheet of the workbook. */
function hyperlinksOf(workbook: ExcelJS.Workbook): string[] {
  const links: string[] = [];
  workbook.eachSheet((sheet) =>
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        if (cell.hyperlink) links.push(cell.hyperlink);
      }),
    ),
  );
  return links;
}

describe("the links in an export", () => {
  test("are relative and each resolves to a file in media/, whatever the Areas and Items are called", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();
    const area = expectOk(await homeCheck.addArea(inspectionId, { customName: "Bilik Utama (Master) #1" })).area;
    const fan = expectOk(await homeCheck.addItem(area.id, { otherName: "Kipas siling / ceiling fan" })).item;
    const unnamed = expectOk(await homeCheck.addItem(area.id, { otherName: "电灯" })).item;
    const items = [fan, unnamed];
    for (const item of items) {
      const photo = expectOk(await homeCheck.addPhoto(item.id, new Blob([`photo of ${item.name}`], { type: "image/jpeg" }))).evidence;
      const video = expectOk(await homeCheck.addVideo(item.id, new Blob([`video of ${item.name}`], { type: "video/mp4" }), 4)).evidence;
      expectOk(await homeCheck.addDefect(item.id, { defectTypeCode: "SF-STAIN", evidenceIds: [photo.id, video.id] }));
    }

    const { zip, workbook } = await unzipExport(expectOk(await homeCheck.exportInspection(inspectionId)).zip);

    const links = hyperlinksOf(workbook);
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(link).toMatch(/^media\/[a-z0-9-]+\.(jpg|mp4)$/);
      expect(zip.file(link), link).not.toBeNull();
    }
    expect(new Set(links).size).toBe(4);
  });
});

describe("the last export of an Inspection", () => {
  test("is recorded on a Draft, and again each time, while it stays a Draft", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithInspection();
    environment.setNow(new Date("2026-01-05T10:00:00.000Z"));
    expectOk(await homeCheck.exportInspection(inspectionId));
    environment.setNow(new Date("2026-01-05T10:30:00.000Z"));

    expectOk(await homeCheck.exportInspection(inspectionId));

    expect(await homeCheck.getInspection(inspectionId)).toMatchObject({
      status: "draft",
      lastExportedAt: "2026-01-05T10:30:00.000Z",
    });
  });

  test("is recorded on a Completed Inspection, which stays Completed and unchanged otherwise", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithItem();
    const completed = expectOk(await homeCheck.completeInspection(inspectionId)).inspection;
    environment.setNow(new Date("2026-01-06T08:00:00.000Z"));

    expectOk(await homeCheck.exportInspection(inspectionId));

    expect(await homeCheck.getInspection(inspectionId)).toEqual({ ...completed, lastExportedAt: "2026-01-06T08:00:00.000Z" });
  });

  test("is never recorded on a new Inspection", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();

    expect(await homeCheck.getInspection(inspectionId)).not.toHaveProperty("lastExportedAt");
  });

  test("can't be made of an Inspection not on this phone", async () => {
    const { homeCheck } = await createTestHomeCheckWithInspection();

    expect(await homeCheck.exportInspection("missing")).toEqual({ ok: false, reason: "inspection-not-found" });
  });
});
