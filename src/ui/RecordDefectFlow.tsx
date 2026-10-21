import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, LoaderCircle, NotebookPen, Plus, Video, X } from "lucide-react";
import { isMedia, isNote, type AiSuggestionView, type DefectView, type Evidence, type ItemView } from "../core";
import type { Navigate } from "./App";
import { assignDefectType } from "./assignDefectType";
import { BackCloses, useBackCloses } from "./backCloses";
import { Band } from "./Band";
import { DefectEditor, DefectTypePicker, type PickedDefectType } from "./DefectPanels";
import { Dock } from "./Dock";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { MediaThumbnail } from "./MediaImage";
import { NoteEditor } from "./ItemScreen";
import { StepHeader } from "./StepHeader";
import { useAiChanges } from "./useAiChanges";
import { VideoRecorder } from "./VideoRecorder";

const STEPS = ["Evidence", "Defect Types", "Severity"];

/** How long the Inspector waits for AI Suggestions before being told to carry on without them. */
const AI_WAIT_SECONDS = 10;

/**
 * Recording a Defect as a guided flow: Evidence, then a Defect Type for each piece, then a Severity (ADR 0006, 0007).
 * Step 1 gathers the Evidence for this Defect. Evidence already on the Item stays on the Item screen, so every run
 * starts empty.
 */
export function RecordDefectFlow({
  item,
  unit,
  areaName,
  navigate,
  onClose,
}: {
  item: ItemView;
  unit?: string;
  areaName?: string;
  navigate: Navigate;
  /** Back to the Item screen, keeping everything captured. */
  onClose: () => void;
}) {
  const homeCheck = useHomeCheck();
  /** 0: Evidence; 1: a Defect Type for each piece of Evidence. */
  const [step, setStep] = useState(0);
  /** The Evidence captured in step 1, fixed once step 2 starts, and which piece step 2 is on. */
  const [pieces, setPieces] = useState<Evidence[]>([]);
  const [index, setIndex] = useState(0);
  const [defects, setDefects] = useState<DefectView[]>([]);
  const [picking, setPicking] = useState(false);
  /** A Defect Type that needs a note before it can be recorded on the current piece. */
  const [noting, setNoting] = useState<PickedDefectType | null>(null);

  /** What the Item already held when the flow opened; anything else on it was captured in this flow. */
  const [before, setBefore] = useState<Set<string> | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [writingNote, setWritingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestionView[]>([]);
  /** Photos still waiting for the AI. */
  const [waitingForAi, setWaitingForAi] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState(() => homeCheck.isOnline());
  /** The AI took longer than `AI_WAIT_SECONDS` for the current photo. */
  const [aiSlow, setAiSlow] = useState(false);
  /** An AI Suggestion for a Defect Type that needs a note, waiting for the note. */
  const [notingSuggestion, setNotingSuggestion] = useState<AiSuggestionView | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const all = await homeCheck.listEvidence(item.id);
    setBefore((known) => known ?? new Set(all.map((each) => each.id)));
    setEvidence(all);
    setDefects(await homeCheck.listDefects(item.id));
    setSuggestions(await homeCheck.listAiSuggestions(item.id));
    setWaitingForAi(new Set((await homeCheck.listWaitingForAi()).map((entry) => entry.evidenceId)));
  }, [homeCheck, item.id]);

  // Also reloads as AI Suggestions arrive while a piece of Evidence is open.
  useAiChanges(load);
  useEffect(() => homeCheck.onOnlineChange(setOnline), [homeCheck]);

  const captured = before ? evidence.filter((each) => !before.has(each.id)) : [];

  async function capture(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const file of files) {
        const result = await homeCheck.addPhoto(item.id, file);
        if (!result.ok) setError(refusalMessage[result.reason]);
      }
    } finally {
      setSaving(false);
      load();
    }
  }

  const piece = pieces[index];
  /** The AI's suggestions for this photo that the Inspector hasn't answered. */
  const suggested = piece ? suggestions.filter((each) => each.evidenceId === piece.id && each.outcome === "unreviewed") : [];
  const waiting = !!piece && step === 1 && suggested.length === 0 && waitingForAi.has(piece.id);

  // The wait is counted per photo, and only while the phone can reach the AI.
  const waitingOnAi = waiting && online;
  const waitingFor = piece?.id;
  useEffect(() => {
    setAiSlow(false);
    if (!waitingOnAi) return;
    const timer = setTimeout(() => setAiSlow(true), AI_WAIT_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [waitingOnAi, waitingFor]);
  /** The Defects this piece of Evidence is assigned to. */
  const assigned = piece ? defects.filter((defect) => defect.evidenceIds.includes(piece.id)) : [];

  function startDefectTypes() {
    setPieces(captured);
    setIndex(0);
    setError(null);
    setStep(1);
  }

  /** Back one piece, or to the Evidence step from the first. */
  function backFromTypes() {
    setError(null);
    if (index > 0) setIndex(index - 1);
    else setStep(0);
  }

  /** On to the next piece. Severity follows the last one (ticket 07); until it is built, the flow ends there. */
  function nextPiece() {
    setError(null);
    if (index < pieces.length - 1) setIndex(index + 1);
    else onClose();
  }

  /**
   * Takes this Defect Type off the piece of Evidence. A Defect always has Evidence (ADR 0006), so if this was its only
   * piece the Defect goes; otherwise the Evidence is just unlinked.
   */
  async function removeType(defect: DefectView) {
    setError(null);
    const remaining = defect.evidenceIds.filter((id) => id !== piece.id);
    const result =
      remaining.length === 0
        ? await homeCheck.removeDefect(defect.id)
        : await homeCheck.editDefect(defect.id, { evidenceIds: remaining });
    if (!result.ok) setError(refusalMessage[result.reason]);
    load();
  }

  /** One tap makes the Defect from the AI's suggestion, marked AI-suggested; its Severity is asked for in step 3. */
  async function acceptSuggestion(suggestion: AiSuggestionView, note?: string) {
    setError(null);
    const needsNote = suggestion.noteRequired && !defects.some((defect) => defect.defectTypeCode === suggestion.defectTypeCode);
    if (needsNote && note === undefined) return setNotingSuggestion(suggestion);
    const result = await homeCheck.confirmAiSuggestion(suggestion.id, { note, withoutSeverity: true });
    if (result.ok) setNotingSuggestion(null);
    else setError(refusalMessage[result.reason]);
    load();
  }

  async function pickType(defectType: PickedDefectType) {
    setPicking(false);
    setError(null);
    const result = await assignDefectType(homeCheck, item.id, defectType, piece.id);
    if (result.kind === "needs-note") setNoting(defectType);
    else if (result.kind === "refused") setError(refusalMessage[result.reason]);
    load();
  }

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={step === 0 ? { onBack: onClose, label: item.displayName } : { onBack: backFromTypes, label: index > 0 ? "Previous Evidence" : "Evidence" }}
        unit={unit}
        title="Record a Defect"
      >
        {areaName && <p className="unit">{areaName}</p>}
      </Band>
      {/* The phone's back gesture leaves the flow, as Back does; what was captured stays on the Item. */}
      <BackCloses onBack={onClose} />
      {step === 1 && <BackCloses key={index} onBack={backFromTypes} />}

      <div className="form spaced">
        <StepHeader titles={STEPS} step={step} />
        {step === 1 && piece ? (
          <>
            <p className="muted">
              Evidence {index + 1} of {pieces.length}
            </p>
            <div key={piece.id} className="evidence-subject">
              {isMedia(piece) ? (
                <span className="ai-group-photo">
                  <MediaThumbnail evidence={piece} />
                </span>
              ) : (
                <p className="card note-card">{isNote(piece) ? piece.text : ""}</p>
              )}
            </div>
            {assigned.length > 0 && (
              <div className="chips">
                {assigned.map((defect) => (
                  <button
                    key={defect.id}
                    type="button"
                    className="chip defect-chip removable"
                    aria-label={`Remove ${defect.defectTypeName}`}
                    title={defect.defectTypeName}
                    onClick={() => removeType(defect)}
                  >
                    {defect.defectTypeName}
                    <X aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            {suggested.length > 0 && (
              <div className="ai-choices">
                <h3>AI suggests</h3>
                <div className="chips">
                  {suggested.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="chip defect-chip ai"
                      title={`${suggestion.defectTypeName}, ${suggestion.confidence.toLowerCase()} confidence`}
                      onClick={() => acceptSuggestion(suggestion)}
                    >
                      {suggestion.defectTypeName}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {waiting &&
              (!online ? (
                <p className="muted ai-status">Offline. Suggestions will appear in the AI Suggestions list later.</p>
              ) : aiSlow ? (
                <p className="notice ai-status" role="status">
                  Suggestions are taking longer than usual. Carry on and they'll appear in the AI Suggestions list.
                </p>
              ) : (
                <p className="muted ai-status" role="status">
                  <LoaderCircle className="spinning" aria-hidden="true" />
                  Looking for suggestions…
                </p>
              ))}
            <button type="button" className="secondary" onClick={() => setPicking(true)}>
              <Plus aria-hidden="true" />
              {assigned.length === 0 ? "Choose a Defect Type" : "Add another Defect Type"}
            </button>
            {error && <p className="error" role="alert">{error}</p>}
          </>
        ) : (
          <>
            {/* What has been captured sits first, where it can't be missed; the prompt shows until there is something. */}
            {captured.length > 0 ? (
              <>
                <h3>Captured for this Defect</h3>
                <ul className="thumbnails">
                  {captured.filter(isMedia).map((media) => (
                    <li key={media.id}>
                      <span className={`thumbnail ${media.kind}`}>
                        <MediaThumbnail evidence={media} />
                      </span>
                    </li>
                  ))}
                </ul>
                <ul className="cards">
                  {captured.filter(isNote).map((note) => (
                    <li key={note.id} className="card note-card">
                      {note.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">Add a photo, video or note that shows the problem.</p>
            )}

            <ul className="cards">
              <li>
                <button type="button" className="card item-card" disabled={saving} onClick={() => cameraInput.current?.click()}>
                  <Camera className="row-icon" aria-hidden="true" />
                  <span className="grow">
                    <strong>{saving ? "Saving…" : "Add a photo"}</strong>
                  </span>
                  <ChevronRight className="chevron" aria-hidden="true" />
                </button>
              </li>
              <li>
                <button type="button" className="card item-card" disabled={saving} onClick={() => setRecording(true)}>
                  <Video className="row-icon" aria-hidden="true" />
                  <span className="grow">
                    <strong>Record a video</strong>
                    <span className="summary">For noise, movement or things a photo can't show</span>
                  </span>
                  <ChevronRight className="chevron" aria-hidden="true" />
                </button>
              </li>
              <li>
                <button type="button" className="card item-card" disabled={writingNote} onClick={() => setWritingNote(true)}>
                  <NotebookPen className="row-icon" aria-hidden="true" />
                  <span className="grow">
                    <strong>Write a note</strong>
                  </span>
                  <ChevronRight className="chevron" aria-hidden="true" />
                </button>
              </li>
            </ul>

            {error && <p className="error" role="alert">{error}</p>}
          </>
        )}
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={capture} />
      {picking && piece && (
        <DefectTypePicker
          itemId={item.id}
          itemName={item.name}
          title="Choose a Defect Type"
          recordedCodes={defects.map((defect) => defect.defectTypeCode)}
          onPicked={pickType}
          onCancel={() => setPicking(false)}
        />
      )}
      {notingSuggestion && (
        <AiSuggestionNote suggestion={notingSuggestion} onSave={(note) => acceptSuggestion(notingSuggestion, note)} onCancel={() => setNotingSuggestion(null)} />
      )}
      {noting && piece && (
        <DefectEditor
          key={noting.code}
          itemId={item.id}
          evidence={evidence}
          defectType={noting}
          initialLinked={[piece.id]}
          onSaved={() => {
            setNoting(null);
            load();
          }}
          onDuplicate={() => setNoting(null)}
          onCancel={() => setNoting(null)}
        />
      )}
      {writingNote && (
        <NoteEditor
          itemId={item.id}
          defects={[]}
          onSaved={() => {
            setWritingNote(false);
            load();
          }}
          onCancel={() => setWritingNote(false)}
        />
      )}
      {recording && (
        <VideoRecorder
          itemId={item.id}
          onSaved={() => {
            setRecording(false);
            load();
          }}
          onClose={() => setRecording(false)}
        />
      )}

      <Dock
        action={
          step === 0 ? (
            <div className="dock-actions">
              <button type="button" className="primary" disabled={captured.length === 0} onClick={startDefectTypes}>
                Next
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="dock-actions">
              <button type="button" className="secondary" onClick={backFromTypes}>
                <ChevronLeft aria-hidden="true" />
                Back
              </button>
              {/* A piece with a Defect Type moves on; one without says it shows no Defect (ADR 0003, 0006). */}
              <button type="button" className="primary" onClick={nextPiece}>
                {assigned.length === 0 ? "No Defect here" : index < pieces.length - 1 ? "Next Evidence" : "Next"}
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          )
        }
      />
    </main>
  );
}

/** The note a suggested Defect Type such as Other / Unknown needs before the Defect can be made. */
function AiSuggestionNote({ suggestion, onSave, onCancel }: { suggestion: AiSuggestionView; onSave: (note: string) => void; onCancel: () => void }) {
  useBackCloses(onCancel);
  const [note, setNote] = useState("");

  function save(event: FormEvent) {
    event.preventDefault();
    onSave(note);
  }

  return (
    <section className="panel">
      <div className="card-row">
        <h2>{suggestion.defectTypeName}</h2>
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <form className="form" onSubmit={save} noValidate>
        <label>
          Note (required): describe what you see
          <textarea className="note-input" value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
        </label>
        <button type="submit" className="primary">
          Add Defect
        </button>
      </form>
    </section>
  );
}
