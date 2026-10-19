import { useState, type FormEvent } from "react";
import type { AiSuggestionView, DefectView } from "../core";
import { DefectTypePicker } from "./DefectPanels";
import { aiOutcomeLabel, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { MediaImage } from "./MediaImage";

/** The Defect Type a suggestion becomes: the AI's own when confirming, or the Inspector's when correcting. */
type Accepted = { code: string; name: string };

type ReviewPanel =
  | { mode: "correct"; suggestion: AiSuggestionView }
  /** A new Other / Unknown Defect needs a note before it can be recorded. */
  | { mode: "note"; suggestion: AiSuggestionView; accepted: Accepted };

/**
 * An Item's AI Suggestions, each confirmed, corrected or rejected by the Inspector.
 * Review stays open on a Completed Inspection, so late suggestions aren't wasted.
 */
export function AiSuggestionList({
  itemId,
  itemName,
  suggestions,
  defects,
  onReviewed,
}: {
  itemId: string;
  itemName: string;
  suggestions: AiSuggestionView[];
  /** The Item's Defects, so the picker can mark Defect Types already recorded. */
  defects: DefectView[];
  /** Called with what happened, once a suggestion is reviewed. */
  onReviewed: (message: string) => void;
}) {
  const homeCheck = useHomeCheck();
  const [panel, setPanel] = useState<ReviewPanel | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ suggestionId: string; message: string } | null>(null);

  /** Confirms the suggestion, or corrects it if `accepted` isn't its own Defect Type. */
  async function accept(suggestion: AiSuggestionView, accepted: Accepted, note?: string) {
    setError(null);
    const result =
      accepted.code === suggestion.defectTypeCode
        ? await homeCheck.confirmAiSuggestion(suggestion.id, { note })
        : await homeCheck.correctAiSuggestion(suggestion.id, { note, defectTypeCode: accepted.code });
    if (result.ok) {
      setPanel(null);
      onReviewed(
        result.addedToExisting
          ? `Photo added to the existing ${result.defect.defectTypeName} Defect.`
          : `Added ${result.defect.defectTypeName} to Defects.`,
      );
    } else if (result.reason === "note-required" && note === undefined) {
      setNote("");
      setPanel({ mode: "note", suggestion, accepted });
    } else {
      setError({ suggestionId: suggestion.id, message: refusalMessage[result.reason] });
    }
  }

  async function reject(suggestion: AiSuggestionView) {
    setError(null);
    const result = await homeCheck.rejectAiSuggestion(suggestion.id);
    if (result.ok) onReviewed(`Rejected ${suggestion.defectTypeName}.`);
    else setError({ suggestionId: suggestion.id, message: refusalMessage[result.reason] });
  }

  function saveNote(event: FormEvent) {
    event.preventDefault();
    if (panel?.mode === "note") accept(panel.suggestion, panel.accepted, note);
  }

  return (
    <>
      <ul className="cards">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className="card ai-suggestion">
            <span className="thumbnail">
              <MediaImage evidenceId={suggestion.evidenceId} version="thumbnail" alt="Photo" />
            </span>
            <span>
              <span className="card-row">
                <strong>{suggestion.defectTypeName}</strong>
                {suggestion.outcome !== "unreviewed" && <span className={`badge ${suggestion.outcome}`}>{aiOutcomeLabel(suggestion)}</span>}
              </span>
              <span className="ai-why">AI suggestion, {suggestion.confidence.toLowerCase()} confidence</span>
            </span>
            {suggestion.outcome === "unreviewed" && panel?.suggestion.id !== suggestion.id && (
              <span className="button-row review-actions">
                <button type="button" className="primary" onClick={() => accept(suggestion, { code: suggestion.defectTypeCode, name: suggestion.defectTypeName })}>
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
            {error?.suggestionId === suggestion.id && panel === null && <p className="error review-actions">{error.message}</p>}
          </li>
        ))}
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
      {panel?.mode === "note" && (
        <section className="panel">
          <div className="card-row">
            <h2>{panel.accepted.name}</h2>
            <button type="button" className="link" onClick={() => setPanel(null)}>
              Cancel
            </button>
          </div>
          <form className="form" onSubmit={saveNote} noValidate>
            <label>
              Note (required: describe what you see)
              <textarea
                className="note-input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. dark patch behind the door"
                autoFocus
              />
            </label>
            {error?.suggestionId === panel.suggestion.id && <p className="error">{error.message}</p>}
            <button type="submit" className="primary">
              Add Defect
            </button>
          </form>
        </section>
      )}
    </>
  );
}
