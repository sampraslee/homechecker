import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ChevronRight, NotebookPen, Video } from "lucide-react";
import { isMedia, isNote, type Evidence, type ItemView } from "../core";
import type { Navigate } from "./App";
import { BackCloses } from "./backCloses";
import { Band } from "./Band";
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
  const [step] = useState(0);
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

  return (
    <main className="screen">
      <Band navigate={navigate} back={{ onBack: onClose, label: item.displayName }} unit={unit} title="Record a Defect">
        {areaName && <p className="unit">{areaName}</p>}
      </Band>
      {/* The phone's back gesture leaves the flow, as Back does; what was captured stays on the Item. */}
      <BackCloses onBack={onClose} />

      <div className="form spaced">
        <StepHeader titles={STEPS} step={step} />
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
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={capture} />
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
          <div className="dock-actions">
            {/* Defect Types and Severity are the next steps; until they are built, the Evidence goes back to the Item screen. */}
            <button type="button" className="primary" disabled={captured.length === 0} onClick={onClose}>
              Next
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        }
      />
    </main>
  );
}
