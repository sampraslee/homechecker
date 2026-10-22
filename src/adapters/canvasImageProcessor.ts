import { fitWithin } from "../core/fitWithin";
import type { ImageProcessor } from "../core/ports";

const EVIDENCE_COPY_LONGEST_EDGE = 1024;
const EVIDENCE_COPY_QUALITY = 0.82;
const THUMBNAIL_LONGEST_EDGE = 320;
const THUMBNAIL_QUALITY = 0.7;
/** Give up on a video's first frame after this long, so a video the browser can't decode stays unprocessed instead of hanging. */
const VIDEO_FRAME_TIMEOUT_MS = 10_000;

/** Resizes on a canvas; respects EXIF orientation and never enlarges. */
export const canvasImageProcessor: ImageProcessor = {
  async processPhoto(original) {
    const bitmap = await createImageBitmap(original, { imageOrientation: "from-image" });
    try {
      return {
        evidenceCopy: await resizeToJpeg(bitmap, bitmap.width, bitmap.height, EVIDENCE_COPY_LONGEST_EDGE, EVIDENCE_COPY_QUALITY),
        thumbnail: await resizeToJpeg(bitmap, bitmap.width, bitmap.height, THUMBNAIL_LONGEST_EDGE, THUMBNAIL_QUALITY),
      };
    } finally {
      bitmap.close();
    }
  },

  /** Draws the video's first frame. The original is only read, never re-encoded. */
  async processVideo(original) {
    const url = URL.createObjectURL(original);
    const video = document.createElement("video");
    try {
      // iOS only decodes a frame for a playing, muted, inline video.
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = url;
      await firstFrame(video);
      return {
        thumbnail: await resizeToJpeg(video, video.videoWidth, video.videoHeight, THUMBNAIL_LONGEST_EDGE, THUMBNAIL_QUALITY),
      };
    } finally {
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    }
  },
};

/**
 * Waits until a frame is decoded and drawable. iOS fires `loadeddata` before painting a frame,
 * which would give a black thumbnail; seeking makes the browser decode the frame it lands on.
 * Playing starts iOS loading; when playback is refused (e.g. Low Power Mode), seeking alone loads it.
 */
function firstFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let seeking = false;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => settle(new Error("Could not read the video's first frame")), VIDEO_FRAME_TIMEOUT_MS);
    const seekToStart = () => {
      if (seeking) return;
      seeking = true;
      video.pause();
      video.addEventListener("seeked", () => settle(), { once: true });
      video.currentTime = 0.001;
    };
    video.addEventListener("error", () => settle(new Error("Could not decode the video")), { once: true });
    video.addEventListener("loadeddata", seekToStart, { once: true });
    video.play().catch(seekToStart);
  });
}

async function resizeToJpeg(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  longestEdge: number,
  quality: number,
): Promise<Blob> {
  const { width, height } = fitWithin({ width: sourceWidth, height: sourceHeight }, longestEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not available");
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode JPEG"))), "image/jpeg", quality),
  );
}
