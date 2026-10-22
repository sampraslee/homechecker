import { useState, type FormEvent } from "react";
import type { AiSuggestionView, DefectView, Evidence, Severity } from "../core";
import { DefectTypePicker, SeverityPicker } from "./DefectPanels";
import { aiOutcomeLabel, formatTime, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { MediaImage } from "./MediaImage";
import { groupByEvidence } from "./suggestionsToReview";

/** The Defect Type a suggestion becomes: the AI's own when confirming, or the Inspector's when correcting. */
type Accepted = { code: string; name: string; noteRequired: boolean };

type ReviewPanel =
  | { mode: "correct"; suggestion: AiSuggestionView }
  /** A new Defect needs a Severity, and a note too for Other / Unknown, before it can be recorded (ADR 0007). */
  | { mode: "details"; suggestion: AiSuggestionView; accepted: Accepted };

/**
 * An Item's AI Suggestions still to act on, grouped by the photo they came from: unreviewed ones are confirmed,
 * corrected or rejected, and rejected ones can be reviewed again. The caller passes only those two kinds.
 */
export function AiSuggestionList({
  itemId,
  itemName,
  suggestions,
  evidence,
  arrived,
  defects,
  onReviewed,
  onReviewAgain,
}: {
  itemId: string;
  itemName: string;
  suggestions: AiSuggestionView[];
  /** The Item's Evidence, for each group's header. */
  evidence: Evidence[];
  /** Suggestions that came in while the Item was open, which arrive with a pulse. */
  arrived: Set<string>;
  /** The Item's Defects, so the picker can mark Defect Types already recorded. */
  defects: DefectView[];
  /** Called with what happened and which suggestion, once a suggestion is reviewed, so the review can be undone. */
  onReviewed: (message: string, suggestionId: string) => void;
  /** Takes a rejection back, so the suggestion is unreviewed again. */
  onReviewAgain: (suggestionId: string) => void;
}) {
  const homeCheck = useHomeCheck();
  const [panel, setPanel] = useState<ReviewPanel | null>(null);
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState<Severity | undefined>(undefined);
  const [error, setError] = useState<{ suggestionId: string; message: string } | null>(null);

  /**
   * Confirms the suggestion, or corrects it if `accepted` isn't its own Defect Type. A new Defect first asks for its
   * Severity; a photo joining a Defect the Item already has doesn't.
   */
  async function accept(suggestion: AiSuggestionView, accepted: Accepted, details?: { note: string; severity: Severity }) {
    setError(null);
    if (!details && !defects.some((defect) => defect.defectTypeCode === accepted.code)) {
      setNote("");
      setSeverity(undefined);
      return setPanel({ mode: "details", suggestion, accepted });
    }
    const { note, severity } = details ?? {};
    const result =
      accepted.code === suggestion.defectTypeCode
        ? await homeCheck.confirmAiSuggestion(suggestion.id, { note, severity })
        : await homeCheck.correctAiSuggestion(suggestion.id, { note, severity, defectTypeCode: accepted.code });
    if (result.ok) {
      setPanel(null);
      onReviewed(
        result.addedToExisting
          ? `Photo added to the existing ${result.defect.defectTypeName} Defect.`
          : `Added ${result.defect.defectTypeName}.`,
        suggestion.id,
      );
    } else {
      setError({ suggestionId: suggestion.id, message: refusalMessage[result.reason] });
    }
  }

  async function reject(suggestion: AiSuggestionView) {
    setError(null);
    const result = await homeCheck.rejectAiSuggestion(suggestion.id);
    if (result.ok) onReviewed(`Rejected ${suggestion.defectTypeName}.`, suggestion.id);
    else setError({ suggestionId: suggestion.id, message: refusalMessage[result.reason] });
  }

  function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (panel?.mode === "details" && severity) accept(panel.suggestion, panel.accepted, { note, severity });
  }

  return (
    <>
      <ul className="ai-groups">
        {groupByEvidence(suggestions).map(({ evidenceId, list }) => {
          const captured = evidence.find((each) => each.id === evidenceId)?.capturedAt;
          return (
            <li key={evidenceId} className="ai-group">
              <span className="ai-group-head">
                <span className="ai-group-photo">
                  <MediaImage evidenceId={evidenceId} version="thumbnail" alt="" />
                </span>
                <span className="ai-group-label">
                  <strong>Photo</strong>
                  {captured && <span className="muted">{formatTime(captured)}</span>}
                </span>
              </span>
              <ul className="ai-rows">
                {list.map((suggestion) => (
                  <li key={suggestion.id} className={`ai-row${arrived.has(suggestion.id) ? " arrived" : ""}`}>
                    <span className="ai-row-head">
                      <strong>{suggestion.defectTypeName}</strong>
                      {suggestion.outcome !== "unreviewed" && <span className={`badge ${suggestion.outcome}`}>{aiOutcomeLabel(suggestion)}</span>}
                    </span>
                    <span className="ai-why">AI suggestion, {suggestion.confidence.toLowerCase()} confidence</span>
                    {suggestion.outcome === "unreviewed" && panel?.suggestion.id !== suggestion.id && (
                      <span className="button-row review-actions">
                        <button type="button" className="primary" onClick={() => accept(suggestion, { code: suggestion.defectTypeCode, name: suggestion.defectTypeName, noteRequired: suggestion.noteRequired })}>
                          Confirm
                        </button>
                        <button type="button" className="secondary" onClick={() => setPanel({ mode: "correct", suggestion })}>
                          Correct
                        </button>
                        <button type="button" className="quiet" onClick={() => reject(suggestion)}>
                          Reject
                        </button>
                      </span>
                    )}
                    {suggestion.outcome === "rejected" && (
                      <span className="button-row review-actions">
                        <button type="button" className="secondary" onClick={() => onReviewAgain(suggestion.id)}>
                          Review again
                        </button>
                      </span>
                    )}
                    {error?.suggestionId === suggestion.id && panel === null && <p className="error review-actions">{error.message}</p>}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {panel?.mode === "correct" && (
        <DefectTypePicker
          itemId={itemId}
          itemName={itemName}
          title={`Correct ${panel.suggestion.defectTypeName} to…`}
          recordedCodes={defects.map((defect) => defect.defectTypeCode)}
          onPicked={(defectType) => accept(panel.suggestion, defectType)}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel?.mode === "details" && (
        <section className="panel">
          <div className="card-row">
            <h2>{panel.accepted.name}</h2>
            <button type="button" className="link" onClick={() => setPanel(null)}>
              Cancel
            </button>
          </div>
          <form className="form" onSubmit={saveDetails} noValidate>
            <div>
              <h3>Severity</h3>
              <SeverityPicker value={severity} onChange={setSeverity} />
            </div>
            {panel.accepted.noteRequired && (
              <label>
                Note (required): describe what you see
                <textarea
                  className="note-input"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. dark patch behind the door"
                />
              </label>
            )}
            {error?.suggestionId === panel.suggestion.id && <p className="error" role="alert">{error.message}</p>}
            <button type="submit" className="primary" disabled={!severity}>
              Add Defect
            </button>
          </form>
        </section>
      )}
    </>
  );
}
