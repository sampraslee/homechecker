import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, NotebookPen, Plus, Video } from "lucide-react";
import { isMedia, isNote, type DefectView, type Evidence, type ItemView } from "../core";
import type { Navigate } from "./App";
import { assignDefectType } from "./assignDefectType";
import { BackCloses } from "./backCloses";
import { Band } from "./Band";
import { DefectEditor, DefectTypePicker, type PickedDefectType } from "./DefectPanels";
import { Dock } from "./Dock";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { MediaThumbnail } from "./MediaImage";
import { NoteEditor } from "./ItemScreen";
import { StepHeader } from "./StepHeader";
import { VideoRecorder } from "./VideoRecorder";

const STEPS = ["Evidence", "Defect Types", "Severity"];

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
  const cameraInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const all = await homeCheck.listEvidence(item.id);
    setBefore((known) => known ?? new Set(all.map((each) => each.id)));
    setEvidence(all);
    setDefects(await homeCheck.listDefects(item.id));
  }, [homeCheck, item.id]);

  useEffect(() => {
    load();
  }, [load]);

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
                  <span key={defect.id} className="chip defect-chip" title={defect.defectTypeName}>
                    {defect.defectTypeName}
                  </span>
                ))}
              </div>
            )}
            <button type="button" className="secondary" onClick={() => setPicking(true)}>
              <Plus aria-hidden="true" />
              {assigned.length === 0 ? "Choose a Defect Type" : "Add another Defect Type"}
            </button>
            {error && <p className="error" role="alert">{error}</p>}
          </>
        ) : (
          <>
            <p className="muted">Add a photo, video or note that shows the problem.</p>

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

            {captured.length > 0 && (
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
            )}
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
