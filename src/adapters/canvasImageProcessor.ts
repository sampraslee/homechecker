import type { ImageProcessor } from "../core/ports";

const EVIDENCE_COPY_LONGEST_EDGE = 2048;
const EVIDENCE_COPY_QUALITY = 0.82;
const THUMBNAIL_LONGEST_EDGE = 320;
const THUMBNAIL_QUALITY = 0.7;

/** Resizes on a canvas; respects EXIF orientation and never enlarges. */
export const canvasImageProcessor: ImageProcessor = {
  async processPhoto(original) {
    const bitmap = await createImageBitmap(original, { imageOrientation: "from-image" });
    try {
      return {
        evidenceCopy: await resizeToJpeg(bitmap, EVIDENCE_COPY_LONGEST_EDGE, EVIDENCE_COPY_QUALITY),
        thumbnail: await resizeToJpeg(bitmap, THUMBNAIL_LONGEST_EDGE, THUMBNAIL_QUALITY),
      };
    } finally {
      bitmap.close();
    }
  },
};

async function resizeToJpeg(bitmap: ImageBitmap, longestEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, longestEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not available");
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode JPEG"))), "image/jpeg", quality),
  );
}
