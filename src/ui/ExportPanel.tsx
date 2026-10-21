import { useState } from "react";
import { Share } from "lucide-react";
import type { Inspection } from "../core";
import { StorageNote } from "./Dock";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { shareOrDownload, TapTooOldError, type ShareOutcome } from "./shareFile";

const exportOutcomeMessage: Record<ShareOutcome, string> = {
  shared: "Export shared.",
  cancelled: "Sharing cancelled. Tap Export to share it again.",
  downloaded: "Export downloaded.",
};

/** Builds the zip of a Completed Inspection and hands it to the share menu. */
export function ExportPanel({
  inspectionId,
  exported,
  promptToExport,
  onExported,
}: {
  inspectionId: string;
  /** Whether this Inspection has been exported, which hides the storage note (UX-021). */
  exported: boolean;
  /** Just Completed: urge an export now, as it's only on this phone until then. */
  promptToExport: boolean;
  onExported: (inspection: Inspection) => void;
}) {
  const homeCheck = useHomeCheck();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A built zip the share menu refused to open for, as the tap was too long ago; a new tap shares or downloads it. */
  const [ready, setReady] = useState<File | null>(null);

  async function share(file: File, secondTap: boolean) {
    try {
      const outcome = await shareOrDownload(file, { secondTap });
      setMessage(exportOutcomeMessage[outcome]);
      setReady(null);
    } catch (shareError) {
      if (!(shareError instanceof TapTooOldError)) throw shareError;
      setReady(file);
    }
  }

  async function exportNow() {
    setExporting(true);
    setMessage(null);
    setError(null);
    setReady(null);
    // Anything thrown surfaces in the ErrorNotice, as on every screen.
    try {
      const result = await homeCheck.exportInspection(inspectionId);
      if (!result.ok) {
        setError(refusalMessage[result.reason]);
        return;
      }
      onExported(result.inspection);
      await share(new File([result.zip as Uint8Array<ArrayBuffer>], result.fileName, { type: "application/zip" }), false);
    } finally {
      setExporting(false);
    }
  }

  const exportButton = (
    <button type="button" className={promptToExport ? "primary" : "secondary"} onClick={exportNow} disabled={exporting}>
      <Share aria-hidden="true" />
      {exporting ? "Exporting…" : promptToExport ? "Export now" : "Export"}
    </button>
  );

  return (
    <section className="spaced">
      {ready ? (
        <>
          <p className="muted">The export is ready. Tap to open the share menu.</p>
          <button type="button" className="primary" onClick={() => share(ready, true)}>
            <Share aria-hidden="true" />
            Share export
          </button>
        </>
      ) : promptToExport ? (
        <div className="prompt">
          <svg className="done-check" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="22" />
            <path d="M14 25l7 7 13-15" />
          </svg>
          <p>Inspection completed. Export it now: until you do, it's only on this phone.</p>
          {exportButton}
        </div>
      ) : (
        exportButton
      )}
      <StorageNote exported={exported} />
      {message && <p className="muted">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
