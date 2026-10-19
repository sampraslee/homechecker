/** How handing a file over ended: the share menu took it, the Inspector closed the menu, or it was downloaded. */
export type ShareOutcome = "shared" | "cancelled" | "downloaded";

/**
 * Opens the phone's share menu with the file, or downloads it where files can't be shared.
 * Rejects with NotAllowedError when the tap that asked is too long ago to open the menu (Safari), so it can be asked again.
 */
export async function shareOrDownload(file: File): Promise<ShareOutcome> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      if (isNotAllowed(error)) throw error;
      // Any other failure: fall back to a download.
    }
  }
  download(file);
  return "downloaded";
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start reading the file before letting it go.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function isNotAllowed(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}
