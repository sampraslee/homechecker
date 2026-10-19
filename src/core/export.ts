import type { Worksheet } from "exceljs";
import { formatAddress } from "./address";
import {
  isMedia,
  isNote,
  type AiSuggestion,
  type AiSuggestionOutcome,
  type Area,
  type DefectSource,
  type DefectView,
  type Evidence,
  type Inspection,
  type Item,
  type MediaEvidence,
  type MediaVersion,
  inspectionTypeLabel,
} from "./model";

/** What goes into an export, gathered by the core. Areas, Items and Evidence are in order. */
export type ExportContent = {
  inspection: Inspection;
  /** The bundled Defect Dictionary's version. */
  dictionaryVersion: string;
  areas: {
    area: Area;
    items: { item: Item; displayName: string; evidence: Evidence[]; defects: DefectView[]; aiSuggestions: AiSuggestion[] }[];
  }[];
  getMedia(evidenceId: string, version: MediaVersion): Promise<Blob | undefined>;
};

/** Every Unit is in Malaysia, so times read the same whichever phone made the export. */
const TIME_ZONE = "Asia/Kuala_Lumpur";

const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" });

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The zip of `inspection.xlsx` and `media/`. ExcelJS and JSZip load only when exporting, to keep the app small. */
export async function buildExportZip(content: ExportContent): Promise<Uint8Array> {
  const [{ default: ExcelJS }, { default: JSZip }] = await Promise.all([import("exceljs"), import("jszip")]);
  const { inspection } = content;
  const zip = new JSZip();
  /** Each photo's and video's path in the zip, for links. Media whose original is missing has none. */
  const mediaPaths = new Map<string, string>();
  for (const { evidence, name } of mediaFiles(content)) {
    const original = await content.getMedia(evidence.id, "original");
    if (!original) continue;
    const path = `media/${name}.${extensionOf(evidence, original)}`;
    zip.file(path, original);
    mediaPaths.set(evidence.id, path);
  }

  /** A cell linking to the media's file in `media/`, named by it; nothing if the media has no file. */
  const mediaLink = (evidenceId: string) => {
    const path = mediaPaths.get(evidenceId);
    return path ? { text: path.slice("media/".length), hyperlink: path } : undefined;
  };

  const workbook = new ExcelJS.Workbook();
  /** The columns every Defect row starts with, the same for the whole Inspection. */
  const inspectionColumns = [
    formatAddress(inspection.address),
    inspectionTypeLabel[inspection.type],
    dateFormat.format(new Date(inspection.startedAt)),
    inspection.inspectorName,
  ];
  const aiSuggestionsById = new Map(
    content.areas.flatMap(({ items }) => items.flatMap((item) => item.aiSuggestions.map((each) => [each.id, each]))),
  );
  const defectRows = content.areas.flatMap(({ area, items }) =>
    items.flatMap(({ displayName, evidence, defects }) =>
      defects.map((defect) => {
        const linked = evidence.filter((each) => defect.evidenceIds.includes(each.id));
        const links = linked.flatMap((each) => mediaLink(each.id) ?? []);
        const notes = linked.filter(isNote).map((each) => each.text);
        const firstPhotoId = linked.find((each) => each.kind === "photo")?.id;
        return {
          firstPhotoId,
          values: [
            ...inspectionColumns,
            area.name,
            displayName,
            defect.categoryName,
            defect.defectTypeCode,
            defect.defectTypeName,
            defect.note ?? null,
            notes.join("\n") || null,
            defectSourceLabel[defect.source],
            (defect.aiSuggestionId && aiSuggestionsById.get(defect.aiSuggestionId)?.confidence) || null,
            null,
            ...links,
          ],
          links,
        };
      }),
    ),
  );
  const mostLinks = Math.max(0, ...defectRows.map((row) => row.links.length));

  const defectsSheet = workbook.addWorksheet("Defects");
  defectsSheet.addRow([
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
    ...Array.from({ length: mostLinks }, (_, index) => `Media ${index + 1}`),
  ]);
  defectsSheet.addRows(defectRows.map((row) => row.values));
  for (const [index, { firstPhotoId }] of defectRows.entries()) {
    const image = firstPhotoId && (await embeddableImage(content, firstPhotoId));
    if (!image) continue;
    const rowNumber = index + 2;
    const size = fitThumbnail(imageSize(image.bytes));
    defectsSheet.getRow(rowNumber).height = size.height * POINTS_PER_PIXEL + 4;
    defectsSheet.addImage(workbook.addImage({ base64: toBase64(image.bytes), extension: image.extension }), {
      tl: { col: PHOTO_COLUMN - 1, row: rowNumber - 1 },
      ext: size,
      editAs: "oneCell",
    });
  }
  defectsSheet.getColumn(PHOTO_COLUMN).width = THUMBNAIL_BOX_PIXELS / PIXELS_PER_CHARACTER + 1;
  styleSheet(defectsSheet, { headerRow: true });

  const aiSuggestionsSheet = workbook.addWorksheet("AI Suggestions");
  aiSuggestionsSheet.addRow(["Area", "Item", "Photo", "Suggested Defect Type code", "Confidence", "Outcome", "Corrected Defect Type code"]);
  aiSuggestionsSheet.addRows(
    content.areas.flatMap(({ area, items }) =>
      items.flatMap(({ displayName, aiSuggestions }) =>
        aiSuggestions.map((suggestion) => [
          area.name,
          displayName,
          mediaLink(suggestion.evidenceId) ?? null,
          suggestion.defectTypeCode,
          suggestion.confidence,
          aiOutcomeLabel[suggestion.outcome],
          suggestion.correctedCode ?? null,
        ]),
      ),
    ),
  );
  styleSheet(aiSuggestionsSheet, { headerRow: true });

  const inspectionSheet = workbook.addWorksheet("Inspection");
  inspectionSheet.addRows([
    ["Inspection type", inspectionTypeLabel[inspection.type]],
    ["Unit address", formatAddress(inspection.address)],
    ["Inspector", inspection.inspectorName],
    ["Started at", dateTimeFormat.format(new Date(inspection.startedAt))],
    ["Completed at", inspection.completedAt ? dateTimeFormat.format(new Date(inspection.completedAt)) : null],
    ["Duration", inspection.completedAt ? formatInspectionDuration(inspection.startedAt, inspection.completedAt) : null],
    ["Defect Dictionary version", content.dictionaryVersion],
  ]);
  // Label and value pairs, so no header row.
  styleSheet(inspectionSheet, { headerRow: false });

  zip.file("inspection.xlsx", await workbook.xlsx.writeBuffer());
  return zip.generateAsync({ type: "uint8array" });
}

const isoDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** e.g. `home-check-move-in-7-jalan-kenari-3-2026-01-05.zip`: type, unit number and street, and start date. */
export function exportFileName(inspection: Inspection): string {
  const { unitNumber, street } = inspection.address;
  const date = isoDateFormat.format(new Date(inspection.startedAt));
  return `${["home-check", inspection.type, slug(unitNumber), slug(street), date].filter(Boolean).join("-")}.zip`;
}

const FONT_NAME = "Inter";
const HEADER_FILL_ARGB = "FF34D3F7";
const HEADER_HEIGHT_PIXELS = 36;
/** Columns fit their longest text up to this many characters wide; longer text wraps. */
const MAX_COLUMN_WIDTH = 60;
/** Inter runs wider than Excel's default font, which column widths are measured in. */
const INTER_WIDTH_FACTOR = 1.1;
const COLUMN_PADDING = 2;

/**
 * Sets every cell in Inter, wrapping, aligned to the top, and fits each column to its longest line of text
 * (never narrower than a width already set, such as the Photo column's). A header row is bold, centred both
 * ways, on the header colour and 36 pixels high.
 */
function styleSheet(sheet: Worksheet, { headerRow }: { headerRow: boolean }) {
  const longest: number[] = [];
  sheet.eachRow((row, rowNumber) => {
    const isHeader = headerRow && rowNumber === 1;
    if (isHeader) row.height = HEADER_HEIGHT_PIXELS * POINTS_PER_PIXEL;
    for (let column = 1; column <= sheet.columnCount; column++) {
      const cell = row.getCell(column);
      cell.font = { name: FONT_NAME, bold: isHeader };
      cell.alignment = isHeader
        ? { horizontal: "center", vertical: "middle", wrapText: true }
        : { vertical: "top", wrapText: true };
      if (isHeader) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } };
      const lineLength = Math.max(0, ...cell.text.split("\n").map((line) => line.length));
      longest[column] = Math.max(longest[column] ?? 0, lineLength);
    }
  });
  longest.forEach((length, column) => {
    const fit = Math.min(MAX_COLUMN_WIDTH, Math.ceil(length * INTER_WIDTH_FACTOR) + COLUMN_PADDING);
    const sheetColumn = sheet.getColumn(column);
    sheetColumn.width = Math.max(sheetColumn.width ?? 0, fit);
  });
}

const defectSourceLabel: Record<DefectSource, string> = { manual: "Manual", "ai-suggested": "AI-suggested" };

const aiOutcomeLabel: Record<AiSuggestionOutcome, string> = {
  unreviewed: "Not reviewed",
  confirmed: "Confirmed",
  corrected: "Corrected",
  rejected: "Rejected",
};

/** The Defects sheet's 1-based column for the embedded photo, after the thirteen text columns before it. */
const PHOTO_COLUMN = 14;
/** An embedded thumbnail fits in a square this many pixels a side. */
const THUMBNAIL_BOX_PIXELS = 120;
const POINTS_PER_PIXEL = 0.75;
/** Roughly how wide one character of column width is in pixels, at Excel's default font. */
const PIXELS_PER_CHARACTER = 7;

type EmbeddableImage = { bytes: Uint8Array; extension: "jpeg" | "png" | "gif" };

/** The photo's thumbnail, or its original while it has none; nothing if neither is a type Excel embeds. */
async function embeddableImage(content: ExportContent, photoId: string): Promise<EmbeddableImage | undefined> {
  const blob = (await content.getMedia(photoId, "thumbnail")) ?? (await content.getMedia(photoId, "original"));
  const extension = blob && embeddableExtensions[mediaTypeOf(blob)];
  if (!blob || !extension) return undefined;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), extension };
}

const embeddableExtensions: Record<string, EmbeddableImage["extension"]> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
};

/** Keeps the image's shape inside the thumbnail box; 4:3 landscape when its size can't be read. */
function fitThumbnail(size: { width: number; height: number } | undefined) {
  const { width, height } = size ?? { width: 4, height: 3 };
  const scale = THUMBNAIL_BOX_PIXELS / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Pixel size from a PNG's header or a JPEG's start-of-frame marker. */
function imageSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const isPng = bytes.length >= 24 && view.getUint32(0) === 0x89504e47;
  if (isPng) return { width: view.getUint32(16), height: view.getUint32(20) };
  const isJpeg = bytes.length >= 4 && view.getUint16(0) === 0xffd8;
  if (!isJpeg) return undefined;
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) return undefined;
    const marker = bytes[offset + 1];
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC), carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    offset += 2 + view.getUint16(offset + 2);
  }
  return undefined;
}

/** The blob's media type without parameters such as codecs, e.g. `video/webm` for `video/webm;codecs=vp9`. */
function mediaTypeOf(blob: Blob): string {
  return blob.type.split(";")[0].trim().toLowerCase();
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

/**
 * Each photo and video with its file name in `media/` before the extension, e.g. `01-bedroom-02-wardrobe-left-03`:
 * the Area's, Item's and media's place in order, so names stay unique and sort as the Inspection reads.
 */
function mediaFiles(content: ExportContent): { evidence: MediaEvidence; name: string }[] {
  const files: { evidence: MediaEvidence; name: string }[] = [];
  content.areas.forEach(({ area, items }, areaIndex) => {
    items.forEach(({ displayName, evidence }, itemIndex) => {
      evidence.filter(isMedia).forEach((media, mediaIndex) => {
        const name = [sequence(areaIndex), slug(area.name), sequence(itemIndex), slug(displayName), sequence(mediaIndex)]
          .filter(Boolean)
          .join("-");
        files.push({ evidence: media, name });
      });
    });
  });
  return files;
}

function sequence(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Lowercase letters and digits joined by hyphens, safe in a file name and a link. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** From the original's media type; by kind when the type is missing or unknown. */
function extensionOf(evidence: MediaEvidence, original: Blob): string {
  return extensions[mediaTypeOf(original)] ?? (evidence.kind === "photo" ? "jpg" : "mp4");
}

/** e.g. "2 h 45 min", or "45 min" under an hour. */
function formatInspectionDuration(startIso: string, endIso: string): string {
  const minutes = Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}
