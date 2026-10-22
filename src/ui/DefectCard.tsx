import { ImageOff } from "lucide-react";
import type { AiSuggestionView, DefectView, Evidence } from "../core";
import { defectOrigin } from "./defectOrigin";
import { MediaImage } from "./MediaImage";

/**
 * A Defect on the Item screen, in the design of an Inspection card: its first photo on top with the Severity on it,
 * then the Defect Type and where the Defect came from. The whole card opens the Defect; "Edit" says so.
 */
export function DefectCard({
  defect,
  evidence,
  suggestions,
  locked,
  arrived,
  onOpen,
}: {
  defect: DefectView;
  /** All of the Item's Evidence; the card picks its first linked photo. */
  evidence: Evidence[];
  suggestions: AiSuggestionView[];
  /** On a Completed Inspection the card opens the Defect to view, not to edit. */
  locked: boolean;
  arrived: boolean;
  onOpen: () => void;
}) {
  const photo = defect.evidenceIds
    .map((id) => evidence.find((each) => each.id === id))
    .find((each) => each?.kind === "photo");
  const origin = defectOrigin(defect, suggestions);
  return (
    <button type="button" className={`card inspection-card defect-card${arrived ? " arrived" : ""}`} onClick={onOpen}>
      <span className="building-photo">
        {photo ? (
          <MediaImage evidenceId={photo.id} version="thumbnail" alt="" className="card-photo" />
        ) : (
          <ImageOff className="card-photo-empty" aria-hidden="true" />
        )}
        <span className={`badge severity ${defect.severity ?? "needed"}`}>{defect.severity ?? "Severity needed"}</span>
      </span>
      <span className="card-heading">
        <span className="defect-card-row">
          <strong className="card-title" title={defect.defectTypeName}>
            {defect.defectTypeName}
          </strong>
          <span className="card-link">{locked ? "View" : "Edit"}</span>
        </span>
        <span className="card-meta muted">
          {origin.kind === "ai-suggested" ? (
            <>
              <span className="ai-why">AI suggested</span>
              <span className="meta-dot" aria-hidden="true" />
              <span>{origin.confidence} confidence</span>
            </>
          ) : (
            <span>Added manually</span>
          )}
        </span>
      </span>
    </button>
  );
}
