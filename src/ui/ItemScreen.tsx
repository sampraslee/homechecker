import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  isMedia,
  type AiSuggestionView,
  type DefectView,
  type Evidence,
  type ItemView,
  type MediaEvidence,
  type MoveInRecord,
  type NoteEvidence,
} from "../core";
import type { Navigate } from "./App";
import { AiSuggestionList } from "./AiSuggestionList";
import { suggestionsToReview } from "./suggestionsToReview";
import { Band } from "./Band";
import { LockedNotice } from "./LockedNotice";
import { Dock } from "./Dock";
import { DefectCard } from "./DefectCard";
import { DefectEditor } from "./DefectPanels";
import { Sheet } from "./Sheet";
import { countEvidence, refusalMessage, unitAndType } from "./format";
import { useBackCloses } from "./backCloses";
import { useHomeCheck } from "./homeCheckContext";
import { MediaImage, MediaThumbnail, useMediaUrl } from "./MediaImage";
import { useAiChanges } from "./useAiChanges";
import { useArrivals } from "./useArrivals";
import { RecordDefectFlow } from "./RecordDefectFlow";
import { StepFooter } from "./StepFooter";
import { useLocked } from "./useLocked";

/** Every Defect is made from a piece of Evidence, so the panels that make one carry that Evidence. */
type DefectPanel = { mode: "edit"; defectId: string; notice?: string };

/** A new note, or one of the Item's notes being edited. */
type NotePanel = { mode: "add" } | { mode: "edit"; note: NoteEvidence };

/** A passing message in the Dock, with Undo when the last action can be taken back. */
type Flash = { text: string; undo?: () => void };

/** How long Undo stays on offer. */
const FLASH_SECONDS = 6;

/** How long the message takes to slide out; matches the CSS. */
const TOAST_OUT_MS = 120;

export function ItemScreen({ id, navigate, saved }: { id: string; navigate: Navigate; saved?: string }) {
  const homeCheck = useHomeCheck();
  const [item, setItem] = useState<ItemView | null | undefined>(undefined);
  const [place, setPlace] = useState<{ areaName: string; unit: string } | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [defects, setDefects] = useState<DefectView[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionView[]>([]);
  /** On a linked Move-out: what the Move-in recorded on this Item, for reference. */
  const [moveIn, setMoveIn] = useState<MoveInRecord | undefined>(undefined);
  const [showMoveInMedia, setShowMoveInMedia] = useState(false);
  const [defectPanel, setDefectPanel] = useState<DefectPanel | null>(null);
  const [notePanel, setNotePanel] = useState<NotePanel | null>(null);
  /** The guided Record a Defect flow, open straight after an Item is added. */
  const [recordingFlow, setRecordingFlow] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(saved ? { text: saved } : null);
  /** The message is sliding out. */
  const [flashLeaving, setFlashLeaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** Undo stays while the Inspector is touching or focused on it, however long that takes. */
  const [flashHeld, setFlashHeld] = useState(false);
  const [viewing, setViewing] = useState<MediaEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = useLocked(item?.inspectionId);
  // Editing controls wait until the lock is known, so they never flash up on a Completed Inspection.
  const editable = locked === false;

  const load = useCallback(async () => {
    const found = await homeCheck.getItem(id);
    setItem(found ?? null);
    if (found) {
      const [area, inspection] = await Promise.all([homeCheck.getArea(found.areaId), homeCheck.getInspection(found.inspectionId)]);
      if (area && inspection) setPlace({ areaName: area.name, unit: unitAndType(inspection) });
    }
    setEvidence(await homeCheck.listEvidence(id));
    setDefects(await homeCheck.listDefects(id));
    setAiSuggestions(await homeCheck.listAiSuggestions(id));
    setMoveIn(await homeCheck.moveInRecord(id));
    setLoaded(true);
  }, [homeCheck, id]);

  const arrived = useArrivals(
    [...evidence.map((each) => each.id), ...defects.map((defect) => defect.id), ...aiSuggestions.map((suggestion) => suggestion.id)],
    loaded,
  );

  function showFlash(next: Flash) {
    setFlashLeaving(false);
    setFlash(next);
  }

  // Also reloads when AI Suggestions arrive while the Item is open.
  useAiChanges(load);

  useEffect(() => {
    if (!flash || flashHeld) return;
    const timer = setTimeout(() => setFlashLeaving(true), FLASH_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [flash, flashHeld]);

  useEffect(() => {
    if (!flashLeaving) return;
    const timer = setTimeout(() => {
      setFlash(null);
      setFlashLeaving(false);
    }, TOAST_OUT_MS);
    return () => clearTimeout(timer);
  }, [flashLeaving]);

  async function undoAiReview(suggestionId: string) {
    const result = await homeCheck.undoAiReview(suggestionId);
    if (result.ok) showFlash({ text: "Undone. The AI Suggestion is back to review." });
    else {
      setFlash(null);
      setError(refusalMessage[result.reason]);
    }
    load();
  }

  /** From the Defect editor: a photo or video opens in the viewer (where it can be deleted), a note opens for editing. */
  function openEvidence(each: Evidence) {
    if (isMedia(each)) setViewing(each);
    else setNotePanel({ mode: "edit", note: each });
  }

  // A Defect whose only Evidence was just deleted goes with it, so its editor has nothing left to edit.
  useEffect(() => {
    if (loaded && defectPanel?.mode === "edit" && !defects.some((defect) => defect.id === defectPanel.defectId)) setDefectPanel(null);
  }, [loaded, defects, defectPanel]);

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
        <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title="Item not found" />
        <p className="muted">This Item is not on this phone.</p>
        <Dock />
      </main>
    );
  }

  // Recording a Defect takes the whole screen, a step at a time.
  if (recordingFlow && editable) {
    return (
      <RecordDefectFlow
        item={item}
        unit={place?.unit}
        areaName={place?.areaName}
        navigate={navigate}
        onClose={(message) => {
          setRecordingFlow(false);
          load();
          if (message) showFlash({ text: message });
        }}
      />
    );
  }

  const photos = evidence.filter((e) => e.kind === "photo");
  const editingDefect = defectPanel ? defects.find((defect) => defect.id === defectPanel.defectId) : undefined;
  /** Confirmed and corrected suggestions are Defects now; what is left is to review, or to review again after a rejection. */
  const shownSuggestions = suggestionsToReview(aiSuggestions);
  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={{ to: { name: "area", id: item.areaId }, label: place?.areaName ?? "Area" }}
        unit={place?.unit}
        title={item.displayName}
      >
        {locked && <LockedNotice />}
      </Band>

      {/* Defects are the list; Evidence comes in only through Record a Defect, and is opened from a Defect (ADR 0006). */}
      <div className="section-head">
        <h2>Evidence and Defects</h2>
        <span className="count">{defects.length > 0 && `${defects.length} ${defects.length === 1 ? "Defect" : "Defects"}`}</span>
      </div>
      {moveIn && (
        <MoveInLine
          record={moveIn}
          expanded={showMoveInMedia}
          onToggle={() => setShowMoveInMedia((shown) => !shown)}
          onOpen={setViewing}
        />
      )}
      {defects.length === 0 && loaded && <p className="muted">{editable ? "No Defects yet. Tap Record a Defect to start." : "No Defects recorded."}</p>}
      <ul className="cards">
        {defects.map((defect) => (
          <li key={defect.id}>
            <DefectCard
              defect={defect}
              evidence={evidence}
              suggestions={aiSuggestions}
              locked={!editable}
              arrived={arrived.has(defect.id)}
              onOpen={() => setDefectPanel({ mode: "edit", defectId: defect.id })}
            />
          </li>
        ))}
      </ul>

      {error && <p className="error" role="alert">{error}</p>}
      {/* Review is locked once the Inspection is Completed, so the app can't drift from its export (ADR 0008). */}
      {editable && (shownSuggestions.length > 0 || (aiSuggestions.length === 0 && photos.length > 0)) && (
        <>
          <div className="section-head">
            <h2>AI Suggestions</h2>
            <span className="count">{unreviewedCount(shownSuggestions)}</span>
          </div>
          {shownSuggestions.length === 0 && <p className="muted">None yet. Photos go to the AI when the phone is online.</p>}
          <AiSuggestionList
            itemId={id}
            itemName={item.name}
            suggestions={shownSuggestions}
            evidence={evidence}
            onReviewAgain={undoAiReview}
            arrived={arrived}
            defects={defects}
            onReviewed={(message, suggestionId) => {
              showFlash({ text: message, undo: () => undoAiReview(suggestionId) });
              load();
            }}
          />
        </>
      )}

      {/* Both open as bottom sheets; the note's comes second so it stacks over the Defect it was opened from. */}
      {editingDefect && (
        <Sheet label={editingDefect.defectTypeName} onClose={closeDefectPanel}>
          {(leave) => (
            <DefectEditor
              key={editingDefect.id}
              itemId={id}
              evidence={evidence}
              defect={editingDefect}
              notice={defectPanel?.notice}
              readOnly={!editable}
              inSheet
              onOpenEvidence={openEvidence}
              onSaved={() => leave(closeDefectPanel)}
              onCancel={() => leave(closeDefectPanel)}
            />
          )}
        </Sheet>
      )}
      {notePanel && (
        <Sheet label="Note" onClose={() => setNotePanel(null)}>
          {(leave) => (
            <NoteEditor
              key={notePanel.mode === "edit" ? notePanel.note.id : "new"}
              itemId={id}
              note={notePanel.mode === "edit" ? notePanel.note : undefined}
              defects={defects}
              inSheet
              onSaved={() => leave(closeNotePanel)}
              onCancel={() => leave(() => setNotePanel(null))}
            />
          )}
        </Sheet>
      )}

      <Dock
        message={
          flash && (
            <div
              className={flashLeaving ? "toast leaving" : "toast"}
              role="status"
              onFocus={() => setFlashHeld(true)}
              onBlur={() => setFlashHeld(false)}
              onPointerEnter={() => setFlashHeld(true)}
              onPointerLeave={() => setFlashHeld(false)}
            >
              <span>{flash.text}</span>
              {flash.undo && (
                <button type="button" onClick={flash.undo}>
                  Undo
                </button>
              )}
            </div>
          )
        }
        action={
          <StepFooter
            onBack={() => navigate({ name: "area", id: item.areaId }, { up: true })}
            onNext={editable ? () => setRecordingFlow(true) : undefined}
            nextLabel="Record a Defect"
          />
        }
      />

      {viewing && (
        <MediaViewer
          evidence={viewing}
          defects={defects}
          aiSuggestions={aiSuggestions}
          canDelete={editable && viewing.itemId === id}
          onClose={() => setViewing(null)}
          onDeleted={() => {
            setViewing(null);
            setFlash(null);
            load();
          }}
        />
      )}
    </main>
  );
}

/**
 * A Move-out Item's reference to the Move-in: the Defects it recorded on the same Item, with a tap to see its photos.
 * Read-only, and never copied into the Move-out.
 */
function MoveInLine({
  record,
  expanded,
  onToggle,
  onOpen,
}: {
  record: MoveInRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (media: MediaEvidence) => void;
}) {
  const names = record.defects.map((defect) => (defect.severity ? `${defect.defectTypeName} · ${defect.severity}` : defect.defectTypeName)).join(", ");
  const media = countEvidence(record.media);
  const text = (
    <>
      <span className="move-in-label">At Move-in</span>
      <span>{names || "No Defects recorded"}</span>
      {media && <span className="muted">{media}</span>}
    </>
  );
  if (record.media.length === 0) return <p className="move-in-line">{text}</p>;
  return (
    <>
      <button type="button" className="move-in-line" aria-expanded={expanded} onClick={onToggle}>
        {text}
        <span className="move-in-toggle">{expanded ? "Hide" : "Show"}</span>
      </button>
      {expanded && (
        <ul className="thumbnails">
          {record.media.map((each, index, all) => (
            <li key={each.id}>
              <button
                type="button"
                className={`thumbnail ${each.kind}`}
                onClick={() => onOpen(each)}
                aria-label={`Open Move-in ${each.kind} ${index + 1} of ${all.length}`}
              >
                <MediaThumbnail evidence={each} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** "2 to review", or nothing once every AI Suggestion is reviewed. */
function unreviewedCount(suggestions: AiSuggestionView[]): string {
  const count = suggestions.filter((suggestion) => suggestion.outcome === "unreviewed").length;
  return count > 0 ? `${count} to review` : "";
}

/**
 * What else goes with a piece of Evidence: the Defects it is the only proof of (which go too, since a Defect always has
 * Evidence), the Defects it is linked to, and a photo's AI Suggestions with any reviews.
 */
function deletionConsequences(evidence: Evidence, defects: DefectView[], aiSuggestions: AiSuggestionView[]): string[] {
  const lines: string[] = [];
  const linked = defects.filter((defect) => defect.evidenceIds.includes(evidence.id));
  const leftBare = linked.filter((defect) => defect.evidenceIds.length === 1).map((defect) => defect.defectTypeName);
  if (leftBare.length > 0) {
    lines.push(`It's the only Evidence for ${listNames(leftBare)}, so ${leftBare.length === 1 ? "that Defect is" : "those Defects are"} removed too.`);
  }
  else if (linked.length > 0) lines.push(`It comes off ${listNames(linked.map((defect) => defect.defectTypeName))}.`);
  const suggestions = aiSuggestions.filter((suggestion) => suggestion.evidenceId === evidence.id);
  const reviewed = suggestions.filter((suggestion) => suggestion.outcome !== "unreviewed").length;
  if (reviewed > 0) {
    lines.push(
      `Its ${suggestions.length === 1 ? "AI Suggestion goes" : `${suggestions.length} AI Suggestions go`} too, ` +
        `with ${reviewed === 1 ? "your review" : "your reviews"}, so ${reviewed === 1 ? "it leaves" : "they leave"} the AI results.`,
    );
  } else if (suggestions.length > 0) {
    lines.push(suggestions.length === 1 ? "Its AI Suggestion goes too." : `Its ${suggestions.length} AI Suggestions go too.`);
  }
  return lines;
}

/** "A", "A and B", "A, B and C". */
function listNames(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function MediaViewer({
  evidence,
  defects,
  aiSuggestions,
  canDelete,
  onClose,
  onDeleted,
}: {
  evidence: MediaEvidence;
  defects: DefectView[];
  aiSuggestions: AiSuggestionView[];
  canDelete: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const homeCheck = useHomeCheck();
  useBackCloses(onClose);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Focus moves into the viewer and returns to the thumbnail on close; Escape closes it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  async function remove() {
    const result = await homeCheck.deleteEvidence(evidence.id);
    if (result.ok) onDeleted();
    else setError(refusalMessage[result.reason]);
  }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={evidence.kind === "photo" ? "Photo" : "Video"}>
      <div className="viewer-bar">
        <button type="button" className="link on-dark" onClick={onClose} ref={closeButton}>
          Close
        </button>
        {canDelete && !confirming && (
          <button type="button" className="link danger-on-dark" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {evidence.kind === "photo" ? (
        <MediaImage evidenceId={evidence.id} version="original" alt="Photo" className="viewer-image square" />
      ) : (
        <VideoPlayer evidenceId={evidence.id} />
      )}
      {/* At the bottom, away from where Delete was, so a double tap can't delete. */}
      {confirming && (
        <section className="panel confirm-card viewer-confirm" aria-label={`Delete this ${evidence.kind}?`}>
          <h2>Delete this {evidence.kind}?</h2>
          {deletionConsequences(evidence, defects, aiSuggestions).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>It can't be undone.</p>
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => setConfirming(false)}>
              Keep {evidence.kind}
            </button>
            <button type="button" className="danger-button" onClick={remove}>
              Delete {evidence.kind}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function VideoPlayer({ evidenceId }: { evidenceId: string }) {
  const url = useMediaUrl(evidenceId, "original");
  return url && <video src={url} className="viewer-image square" controls playsInline />;
}

export function NoteEditor({
  itemId,
  note,
  defects,
  inSheet = false,
  onSaved,
  onCancel,
}: {
  /** The Item's id, or a way to get it that makes a new Item first; `null` if it can't be made. */
  itemId: string | (() => Promise<string | null>);
  note?: NoteEvidence;
  defects: DefectView[];
  /** Shown inside a bottom sheet, which supplies the panel's frame. */
  inSheet?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  useBackCloses(onCancel);
  const [text, setText] = useState(note?.text ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    // A new Item is only made for a note that will be saved.
    if (!note && !text.trim()) return setError(refusalMessage["blank-note"]);
    const id = typeof itemId === "function" ? await itemId() : itemId;
    if (!note && !id) return;
    const result = note ? await homeCheck.editNote(note.id, text) : await homeCheck.addNote(id!, text);
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
    <section className={inSheet ? "sheet-body" : "panel"}>
      <div className={inSheet ? "card-row sheet-head" : "card-row"}>
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
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="primary">
          Save note
        </button>
      </form>
      {note &&
        (confirmingDelete ? (
          <>
            <p>Delete this note?</p>
            {deletionConsequences(note, defects, []).map((line) => (
              <p key={line}>{line}</p>
            ))}
            <div className="button-row">
              <button type="button" className="secondary" onClick={() => setConfirmingDelete(false)}>
                Keep note
              </button>
              <button type="button" className="link danger" onClick={remove}>
                Delete note
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmingDelete(true)}>
            Delete note
          </button>
        ))}
    </section>
  );
}
