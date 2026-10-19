/** How handing a file over ended: the share menu took it, the Inspector closed the menu, or it was downloaded. */
export type ShareOutcome = "shared" | "cancelled" | "downloaded";

/** Thrown when the share menu refused only because the tap that asked was too long ago, so a new tap may work. */
export class TapTooOldError extends Error {
  constructor() {
    super("The share menu needs a fresh tap");
    this.name = "TapTooOldError";
  }
}

/**
 * Opens the phone's share menu with the file, or downloads it where it can't be shared.
 *
 * Browsers refuse with NotAllowedError both when the tap is too long ago (Safari, after the zip took a while to
 * build) and when they won't share the file at all (Chrome on Android shares only some file types, not .zip, yet
 * `canShare` says yes). Only the first can be fixed by tapping again: when the tap was still recent, or this is
 * already a second tap (`secondTap`), it downloads instead. Otherwise rejects with TapTooOldError.
 */
export async function shareOrDownload(file: File, { secondTap }: { secondTap: boolean }): Promise<ShareOutcome> {
  if (navigator.canShare?.({ files: [file] })) {
    // Read before sharing, which uses the tap up.
    const tapStillRecent = navigator.userActivation?.isActive ?? false;
    try {
      await navigator.share({ files: [file], title: file.name });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      if (isNotAllowed(error) && !tapStillRecent && !secondTap) throw new TapTooOldError();
      // Refused for good, or failed some other way: download instead.
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

function isNotAllowed(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}
