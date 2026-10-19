import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { isMedia, isNote, type AiSuggestionView, type DefectView, type Evidence, type ItemView, type MediaEvidence, type NoteEvidence } from "../core";
import type { Navigate } from "./App";
import { AiSuggestionList } from "./AiSuggestionList";
import { BackBar } from "./BackBar";
import { DefectEditor, DefectTypePicker, type PickedDefectType } from "./DefectPanels";
import { lockedNotice, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { MediaImage, MediaThumbnail, useMediaUrl } from "./MediaImage";
import { useAiChanges } from "./useAiChanges";
import { useLocked } from "./useLocked";
import { VideoRecorder } from "./VideoRecorder";

type DefectPanel =
  | { mode: "pick" }
  | { mode: "add"; defectType: PickedDefectType }
  | { mode: "edit"; defectId: string; notice?: string };

/** A new note, or one of the Item's notes being edited. */
type NotePanel = { mode: "add" } | { mode: "edit"; note: NoteEvidence };

/** An Item has at most one Defect per Defect Type, so picking one it already has opens that Defect. */
function alreadyRecorded(defectId: string, defectType: PickedDefectType): DefectPanel {
  return { mode: "edit", defectId, notice: `This Item already has ${defectType.name}. Add to this Defect instead.` };
}

export function ItemScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [item, setItem] = useState<ItemView | null | undefined>(undefined);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [defects, setDefects] = useState<DefectView[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionView[]>([]);
  const [defectPanel, setDefectPanel] = useState<DefectPanel | null>(null);
  const [notePanel, setNotePanel] = useState<NotePanel | null>(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);
  const [viewing, setViewing] = useState<MediaEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const locked = useLocked(item?.inspectionId);
  // Editing controls wait until the lock is known, so they never flash up on a Completed Inspection.
  const editable = locked === false;

  const load = useCallback(async () => {
    setItem((await homeCheck.getItem(id)) ?? null);
    setEvidence(await homeCheck.listEvidence(id));
    setDefects(await homeCheck.listDefects(id));
    setAiSuggestions(await homeCheck.listAiSuggestions(id));
  }, [homeCheck, id]);

  // Also reloads when AI Suggestions arrive while the Item is open.
  useAiChanges(load);

  async function capture(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setSaving(true);
    setSaved(null);
    setError(null);
    let savedCount = 0;
    try {
      for (const file of files) {
        const result = await homeCheck.addPhoto(id, file);
        if (result.ok) savedCount++;
        else setError(refusalMessage[result.reason]);
      }
    } finally {
      // Free the button even if a save throws, so the Inspector can try again.
      setSaving(false);
      if (savedCount > 0) setSaved(savedCount === 1 ? "Photo saved on device." : `${savedCount} photos saved on device.`);
      load();
    }
  }

  function closeNotePanel() {
    setNotePanel(null);
    load();
  }

  function closeDefectPanel() {
    setDefectPanel(null);
    load();
  }

  if (item === undefined) return null;
  if (item === null) {
    return (
      <main className="screen">
        <BackBar navigate={navigate} />
        <p className="muted">This Item is not on this phone.</p>
      </main>
    );
  }

  return (
    <main className="screen">
      <BackBar navigate={navigate} to={{ name: "area", id: item.areaId }} label="Area" />
      <h1>{item.displayName}</h1>
      {locked && <p className="notice">{lockedNotice}</p>}

      <h2>Evidence</h2>
      {evidence.length === 0 && <p className="muted">No photos, videos or notes yet.</p>}
      <ul className="thumbnails">
        {evidence.filter(isMedia).map((media) => (
          <li key={media.id}>
            <button
              type="button"
              className={`thumbnail ${media.kind}`}
              onClick={() => setViewing(media)}
              aria-label={`Open ${media.kind}`}
            >
              <MediaThumbnail evidence={media} />
            </button>
          </li>
        ))}
      </ul>
      <ul className="cards">
        {evidence.filter(isNote).map((note) => (
          <li key={note.id}>
            {editable ? (
              <button
                type="button"
                className="card note-card"
                onClick={() => setNotePanel({ mode: "edit", note })}
                aria-label={`Edit note: ${note.text}`}
              >
                {note.text}
              </button>
            ) : (
              <div className="card note-card">{note.text}</div>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={capture}
          />
          <button type="button" className="primary spaced" disabled={saving} onClick={() => cameraInput.current?.click()}>
            {saving ? "Saving…" : "Take photo"}
          </button>
          <div className="button-row spaced capture-row">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => {
                setSaved(null);
                setRecording(true);
              }}
            >
              Record video
            </button>
            <button
              type="button"
              className="secondary"
              disabled={notePanel !== null}
              onClick={() => {
                setSaved(null);
                setNotePanel({ mode: "add" });
              }}
            >
              Add note
            </button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
      {!saving && saved && (
        <p className="muted" role="status">
          {saved}
        </p>
      )}
      {notePanel && (
        <NoteEditor
          key={notePanel.mode === "edit" ? notePanel.note.id : "new"}
          itemId={id}
          note={notePanel.mode === "edit" ? notePanel.note : undefined}
          onSaved={closeNotePanel}
          onCancel={() => setNotePanel(null)}
        />
      )}

      <h2>Defects{defects.length > 0 && ` (${defects.length})`}</h2>
      {defects.length === 0 && <p className="muted">No Defects recorded.</p>}
      <ul className="cards">
        {defects.map((defect) => {
          const summary = (
            <>
              <span className="card-row">
                <strong>
                  {defect.defectTypeName}
                  {defect.source === "ai-suggested" && <span className="badge ai-suggested">AI-suggested</span>}
                </strong>
                <span className="muted defect-meta">
                  {defect.evidenceIds.length} linked
                </span>
              </span>
              <span className="muted defect-meta">
                {defect.defectTypeCode} · {defect.categoryName}
              </span>
              {defect.note && <span>{defect.note}</span>}
            </>
          );
          return (
            <li key={defect.id}>
              {editable ? (
                <button type="button" className="card" onClick={() => setDefectPanel({ mode: "edit", defectId: defect.id })}>
                  {summary}
                </button>
              ) : (
                <div className="card">{summary}</div>
              )}
            </li>
          );
        })}
      </ul>

      {editable && defectPanel === null && (
        <button type="button" className="primary spaced" onClick={() => setDefectPanel({ mode: "pick" })}>
          Add Defect
        </button>
      )}
      {defectPanel?.mode === "pick" && (
        <DefectTypePicker
          itemId={id}
          itemName={item.name}
          recordedCodes={defects.map((defect) => defect.defectTypeCode)}
          onPicked={(defectType) => {
            const existing = defects.find((defect) => defect.defectTypeCode === defectType.code);
            setDefectPanel(existing ? alreadyRecorded(existing.id, defectType) : { mode: "add", defectType });
          }}
          onCancel={() => setDefectPanel(null)}
        />
      )}
      {defectPanel?.mode === "add" && (
        <DefectEditor
          key={defectPanel.defectType.code}
          itemId={id}
          evidence={evidence}
          defectType={defectPanel.defectType}
          onSaved={closeDefectPanel}
          onDuplicate={(existingDefectId) => setDefectPanel(alreadyRecorded(existingDefectId, defectPanel.defectType))}
          onCancel={() => setDefectPanel(null)}
        />
      )}
      {defectPanel?.mode === "edit" && (
        <ExistingDefectEditor
          key={defectPanel.defectId}
          defectId={defectPanel.defectId}
          itemId={id}
          evidence={evidence}
          notice={defectPanel.notice}
          onSaved={closeDefectPanel}
          onCancel={() => setDefectPanel(null)}
        />
      )}

      {(aiSuggestions.length > 0 || evidence.some((e) => e.kind === "photo")) && (
        <>
          <h2>AI Suggestions{aiSuggestions.length > 0 && ` (${aiSuggestions.length})`}</h2>
          {aiSuggestions.length === 0 && <p className="muted">None yet. Photos are sent to the AI whenever the phone is online.</p>}
          <AiSuggestionList
            itemId={id}
            itemName={item.name}
            suggestions={aiSuggestions}
            defects={defects}
            onReviewed={(message) => {
              setReviewed(message);
              load();
            }}
          />
          {reviewed && (
            <p className="muted" role="status">
              {reviewed}
            </p>
          )}
        </>
      )}

      {viewing && (
        <MediaViewer
          evidence={viewing}
          canDelete={editable}
          onClose={() => setViewing(null)}
          onDeleted={() => {
            setViewing(null);
            setSaved(null);
            load();
          }}
        />
      )}
      {recording && (
        <VideoRecorder
          itemId={id}
          onSaved={() => {
            setRecording(false);
            setSaved("Video saved on device.");
            load();
          }}
          onClose={() => setRecording(false)}
        />
      )}
    </main>
  );
}

function MediaViewer({
  evidence,
  canDelete,
  onClose,
  onDeleted,
}: {
  evidence: MediaEvidence;
  canDelete: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const result = await homeCheck.deleteEvidence(evidence.id);
    if (result.ok) onDeleted();
    else setError(refusalMessage[result.reason]);
  }

  return (
    <div className="viewer" role="dialog" aria-label={evidence.kind === "photo" ? "Photo" : "Video"}>
      <div className="viewer-bar">
        <button type="button" className="link on-dark" onClick={onClose}>
          Close
        </button>
        {!canDelete ? null : confirming ? (
          <span className="button-row">
            <button type="button" className="link on-dark" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button type="button" className="link danger-on-dark" onClick={remove}>
              Delete {evidence.kind}
            </button>
          </span>
        ) : (
          <button type="button" className="link danger-on-dark" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {evidence.kind === "photo" ? (
        <MediaImage evidenceId={evidence.id} version="original" alt="Photo" className="viewer-image" />
      ) : (
        <VideoPlayer evidenceId={evidence.id} />
      )}
    </div>
  );
}

function VideoPlayer({ evidenceId }: { evidenceId: string }) {
  const url = useMediaUrl(evidenceId, "original");
  return url && <video src={url} className="viewer-image" controls playsInline />;
}

function NoteEditor({
  itemId,
  note,
  onSaved,
  onCancel,
}: {
  itemId: string;
  note?: NoteEvidence;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [text, setText] = useState(note?.text ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = note ? await homeCheck.editNote(note.id, text) : await homeCheck.addNote(itemId, text);
    if (result.ok) onSaved();
    else setError(refusalMessage[result.reason]);
  }

  async function remove() {
    if (!note) return;
    const result = await homeCheck.deleteEvidence(note.id);
    if (result.ok) onSaved();
    else setError(refusalMessage[result.reason]);
  }

  return (
    <section className="panel">
      <div className="card-row">
        <h2>{note ? "Edit note" : "Add note"}</h2>
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <form className="form" onSubmit={save} noValidate>
        <label>
          Note
          <textarea
            className="note-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="e.g. left door sticks halfway when opening"
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary">
          Save note
        </button>
      </form>
      {note &&
        (confirmingDelete ? (
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => setConfirmingDelete(false)}>
              Keep
            </button>
            <button type="button" className="link danger" onClick={remove}>
              Delete note
            </button>
          </div>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmingDelete(true)}>
            Delete note
          </button>
        ))}
    </section>
  );
}

function ExistingDefectEditor({
  defectId,
  ...props
}: { defectId: string; itemId: string; evidence: Evidence[]; notice?: string; onSaved: () => void; onCancel: () => void }) {
  const homeCheck = useHomeCheck();
  const [defect, setDefect] = useState<DefectView | null>(null);

  useEffect(() => {
    homeCheck.getDefect(defectId).then((found) => setDefect(found ?? null));
  }, [homeCheck, defectId]);

  return defect && <DefectEditor {...props} defect={defect} />;
}
