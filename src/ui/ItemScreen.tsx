import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Camera, Check, NotebookPen, Plus, Video } from "lucide-react";
import {
  isMedia,
  isNote,
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
import { Band } from "./Band";
import { LockedNotice } from "./LockedNotice";
import { Dock } from "./Dock";
import { DefectEditor, DefectTypePicker, type PickedDefectType } from "./DefectPanels";
import { assignDefectType } from "./assignDefectType";
import { countEvidence, refusalMessage, unitAndType } from "./format";
import { useBackCloses } from "./backCloses";
import { useHomeCheck } from "./homeCheckContext";
import { MediaImage, MediaThumbnail, useMediaUrl } from "./MediaImage";
import { useAiChanges } from "./useAiChanges";
import { useArrivals } from "./useArrivals";
import { RecordDefectFlow } from "./RecordDefectFlow";
import { SwipeToDelete } from "./SwipeToDelete";
import { useLocked } from "./useLocked";
import { VideoRecorder } from "./VideoRecorder";

/** Every Defect is made from a piece of Evidence, so the panels that make one carry that Evidence. */
type DefectPanel =
  | { mode: "pick"; evidenceId: string }
  | { mode: "add"; defectType: PickedDefectType; evidenceId: string }
  | { mode: "edit"; defectId: string; notice?: string };

/** A new note, or one of the Item's notes being edited. */
type NotePanel = { mode: "add" } | { mode: "edit"; note: NoteEvidence };

/** An Item has at most one Defect per Defect Type, so picking one it already has opens that Defect. */
function alreadyRecorded(defectId: string, defectType: PickedDefectType): DefectPanel {
  return { mode: "edit", defectId, notice: `This Item already has ${defectType.name}. Add to this Defect instead.` };
}

/** The Severity after a Defect's name, or a reminder when it has none (ADR 0007). */
export function severityMark(defect: DefectView) {
  return <span className={`chip-severity${defect.severity ? "" : " needed"}`}> · {defect.severity ?? "Severity needed"}</span>;
}

/** A passing message in the Dock, with Undo when the last action can be taken back. */
type Flash = { text: string; undo?: () => void };

/** How long Undo stays on offer. */
const FLASH_SECONDS = 6;

/** How long the message takes to slide out; matches the CSS. */
const TOAST_OUT_MS = 120;

export function ItemScreen({ id, navigate, recordingDefect = false }: { id: string; navigate: Navigate; recordingDefect?: boolean }) {
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
  const [recording, setRecording] = useState(false);
  /** The guided Record a Defect flow, open straight after an Item is added. */
  const [recordingFlow, setRecordingFlow] = useState(recordingDefect);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  /** The message is sliding out. */
  const [flashLeaving, setFlashLeaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** Undo stays while the Inspector is touching or focused on it, however long that takes. */
  const [flashHeld, setFlashHeld] = useState(false);
  const [viewing, setViewing] = useState<MediaEvidence | null>(null);
  /** The piece of Evidence the Inspector swiped Delete on, shown with what else would go. */
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
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

  async function capture(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setSaving(true);
    setFlash(null);
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
      if (savedCount > 0) {
        showFlash({ text: savedCount === 1 ? "Photo saved." : `${savedCount} photos saved.` });
        // A short buzz where the phone allows it (Android; iPhone browsers don't).
        navigator.vibrate?.(10);
      }
      load();
    }
  }

  /**
   * Assigning a Defect Type to a piece of Evidence records the Defect straight away, unless it needs a note first. If the
   * Item already has that Defect Type, the Evidence is added to that Defect instead, since an Item has one Defect per type.
   */
  async function pickDefectType(defectType: PickedDefectType, evidenceId: string) {
    setError(null);
    const assigned = await assignDefectType(homeCheck, id, defectType, evidenceId);
    switch (assigned.kind) {
      case "already-linked":
        return setDefectPanel(alreadyRecorded(assigned.defectId, defectType));
      case "needs-note":
        return setDefectPanel({ mode: "add", defectType, evidenceId });
      case "refused":
        return setError(refusalMessage[assigned.reason]);
      case "linked":
        showFlash({ text: `Linked to ${defectType.name}.` });
        break;
      case "added":
        showFlash({ text: `Added ${defectType.name}.`, undo: () => undoDefect(assigned.defect.id, defectType.name) });
        break;
    }
    setDefectPanel(null);
    load();
  }

  async function undoDefect(defectId: string, name: string) {
    const result = await homeCheck.removeDefect(defectId);
    if (result.ok) showFlash({ text: `Removed ${name}.` });
    else {
      setFlash(null);
      setError(refusalMessage[result.reason]);
    }
    load();
  }

  async function deleteEvidence(evidenceId: string) {
    const result = await homeCheck.deleteEvidence(evidenceId);
    setConfirmingDelete(null);
    if (result.ok) showFlash({ text: "Deleted." });
    else setError(refusalMessage[result.reason]);
    load();
  }

  async function undoAiReview(suggestionId: string) {
    const result = await homeCheck.undoAiReview(suggestionId);
    if (result.ok) showFlash({ text: "Undone. The AI Suggestion is back to review." });
    else {
      setFlash(null);
      setError(refusalMessage[result.reason]);
    }
    load();
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
        onClose={() => {
          setRecordingFlow(false);
          load();
        }}
      />
    );
  }

  const photos = evidence.filter((e) => e.kind === "photo");
  /** A rejected suggestion is out of the Inspector's way, but stays on record and in the export. */
  const shownSuggestions = aiSuggestions.filter((suggestion) => suggestion.outcome !== "rejected");
  /** Evidence that no Defect uses yet: each waits for a Defect Type to be assigned to it. */
  const assignedIds = new Set(defects.flatMap((defect) => defect.evidenceIds));
  const unassigned = evidence.filter((each) => !assignedIds.has(each.id));
  /** Defects whose Evidence is all gone: only from before every Defect needed Evidence (ADR 0006). */
  const evidenceIds = new Set(evidence.map((each) => each.id));
  const withoutEvidence = defects.filter((defect) => !defect.evidenceIds.some((evidenceId) => evidenceIds.has(evidenceId)));
  const counts = [countEvidence(evidence), defects.length > 0 && `${defects.length} ${defects.length === 1 ? "Defect" : "Defects"}`];

  /** The Evidence the picker is assigning a Defect Type to, named at the top of the sheet (UX-025). */
  const assigning = defectPanel?.mode === "pick" ? evidence.find((each) => each.id === defectPanel.evidenceId) : undefined;
  const assigningSubject = assigning && (
    <span className="sheet-subject-row">
      {isMedia(assigning) ? (
        <span className="sheet-thumb">
          <MediaThumbnail evidence={assigning} />
        </span>
      ) : (
        <NotebookPen className="row-icon" aria-hidden="true" />
      )}
      <span>For {isNote(assigning) ? <q>{assigning.text}</q> : `this ${assigning.kind}`}</span>
    </span>
  );

  function recordVideo() {
    setFlash(null);
    setRecording(true);
  }

  function addNote() {
    setFlash(null);
    setNotePanel({ mode: "add" });
  }

  /** A long name is cut to one line (UX-028); the full name shows on hover and in the Defect it opens. */
  function defectChip(defect: DefectView) {
    const className = `chip defect-chip${defect.source === "ai-suggested" ? " ai" : ""}${arrived.has(defect.id) ? " arrived" : ""}`;
    return editable ? (
      <button
        key={defect.id}
        type="button"
        className={className}
        title={defect.defectTypeName}
        onClick={() => setDefectPanel({ mode: "edit", defectId: defect.id })}
      >
        {defect.defectTypeName}
        {severityMark(defect)}
      </button>
    ) : (
      <span key={defect.id} className={className} title={defect.defectTypeName}>
        {defect.defectTypeName}
        {severityMark(defect)}
      </span>
    );
  }

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

      {/* One list: each piece of Evidence with the Defect Types assigned to it (ADR 0006). */}
      <div className="section-head">
        <h2>Evidence and Defects</h2>
        <span className="count">{counts.filter(Boolean).join(" · ")}</span>
      </div>
      {editable && (
        <button type="button" className="primary record-defect" onClick={() => setRecordingFlow(true)}>
          <Plus aria-hidden="true" />
          Record a Defect
        </button>
      )}
      {moveIn && (
        <MoveInLine
          record={moveIn}
          expanded={showMoveInMedia}
          onToggle={() => setShowMoveInMedia((shown) => !shown)}
          onOpen={setViewing}
        />
      )}
      {evidence.length === 0 && <p className="muted">{editable ? "Add a photo or a note to start. Defects are added from the Evidence." : "No Evidence recorded."}</p>}
      {editable && defects.length === 0 && unassigned.length > 0 && (
        <p className="muted">Assign a Defect Type to your Evidence to record a Defect.</p>
      )}
      <ul className="evidence-cards">
        {evidence.map((each) => {
          const supports = defects.filter((defect) => defect.evidenceIds.includes(each.id));
          return (
            <li key={each.id}>
              {confirmingDelete === each.id ? (
                <div className="evidence-card confirm-card" role="group" aria-label={`Delete this ${each.kind}?`}>
                  <div className="evidence-card-body">
                    <h2>Delete this {each.kind}?</h2>
                    {deletionConsequences(each, defects, aiSuggestions).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    <p>It can't be undone.</p>
                    <div className="button-row">
                      <button type="button" className="secondary" onClick={() => setConfirmingDelete(null)}>
                        Keep {each.kind}
                      </button>
                      <button type="button" className="danger-button" onClick={() => deleteEvidence(each.id)}>
                        Delete {each.kind}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <EvidenceRow
                  deletable={editable}
                  label={`Delete ${isNote(each) ? `note: ${each.text}` : each.kind}`}
                  onDelete={() => setConfirmingDelete(each.id)}
                >
                  <div className={`evidence-card${isNote(each) ? " note" : ""}${arrived.has(each.id) ? " arrived" : ""}`}>
                  {isMedia(each) ? (
                    <button type="button" className={`evidence-thumb ${each.kind}`} onClick={() => setViewing(each)} aria-label={`Open ${each.kind}`}>
                      <MediaThumbnail evidence={each} />
                    </button>
                  ) : editable ? (
                    <button
                      type="button"
                      className="evidence-thumb note"
                      onClick={() => setNotePanel({ mode: "edit", note: each })}
                      aria-label={`Edit note: ${each.text}`}
                    >
                      <NotebookPen aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="evidence-thumb note">
                      <NotebookPen aria-hidden="true" />
                    </span>
                  )}
                  <div className="evidence-card-body">
                    {isNote(each) && <p className="evidence-note-text">{each.text}</p>}
                    <div className="chips">
                      {supports.map(defectChip)}
                      {editable && (
                        <button
                          type="button"
                          className="chip assign-chip"
                          onClick={() => setDefectPanel({ mode: "pick", evidenceId: each.id })}
                          aria-label={`Assign a Defect Type to ${isNote(each) ? `note: ${each.text}` : each.kind}`}
                        >
                          <Plus aria-hidden="true" />
                          {supports.length === 0 ? "Assign" : "Add"}
                        </button>
                      )}
                    </div>
                  </div>
                  </div>
                </EvidenceRow>
              )}
            </li>
          );
        })}
      </ul>
      {withoutEvidence.length > 0 && (
        <>
          <p className="muted spaced">No Evidence linked. Open a Defect to link a photo or note.</p>
          <div className="chips">{withoutEvidence.map(defectChip)}</div>
        </>
      )}

      {editable && <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={capture} />}
      {error && <p className="error" role="alert">{error}</p>}
      {notePanel && (
        <NoteEditor
          key={notePanel.mode === "edit" ? notePanel.note.id : "new"}
          itemId={id}
          note={notePanel.mode === "edit" ? notePanel.note : undefined}
          defects={defects}
          onSaved={closeNotePanel}
          onCancel={() => setNotePanel(null)}
        />
      )}

      {/* Straight after the photos they came from, so review happens while the Item is in front of the Inspector. */}
      {(shownSuggestions.length > 0 || photos.length > 0) && (
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
            arrived={arrived}
            defects={defects}
            onReviewed={(message, suggestionId) => {
              showFlash({ text: message, undo: () => undoAiReview(suggestionId) });
              load();
            }}
          />
        </>
      )}

      {defectPanel?.mode === "pick" && (
        <DefectTypePicker
          itemId={id}
          itemName={item.name}
          title="Assign Defect Type"
          subject={assigningSubject}
          recordedCodes={defects.map((defect) => defect.defectTypeCode)}
          onPicked={(defectType) => pickDefectType(defectType, defectPanel.evidenceId)}
          onCancel={() => setDefectPanel(null)}
        />
      )}
      {defectPanel?.mode === "add" && (
        <DefectEditor
          key={defectPanel.defectType.code}
          itemId={id}
          evidence={evidence}
          defectType={defectPanel.defectType}
          initialLinked={[defectPanel.evidenceId]}
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
          // Every way to capture Evidence, and Done, in one bar in thumb reach.
          <div className="dock-tiles">
            {editable && (
              <>
                <button type="button" className="primary" disabled={saving} onClick={() => cameraInput.current?.click()}>
                  <Camera aria-hidden="true" />
                  {saving ? "Saving…" : "Photo"}
                </button>
                <button type="button" className="secondary" disabled={saving} onClick={recordVideo}>
                  <Video aria-hidden="true" />
                  Video
                </button>
                <button type="button" className="secondary" disabled={notePanel !== null} onClick={addNote}>
                  <NotebookPen aria-hidden="true" />
                  Note
                </button>
              </>
            )}
            {/* Finished with this Item: back to the Area's Items. */}
            <button type="button" className="secondary" onClick={() => navigate({ name: "area", id: item.areaId }, { up: true })}>
              <Check aria-hidden="true" />
              Done
            </button>
          </div>
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
      {recording && (
        <VideoRecorder
          itemId={id}
          onSaved={() => {
            setRecording(false);
            showFlash({ text: "Video saved." });
            load();
          }}
          onClose={() => setRecording(false)}
        />
      )}
    </main>
  );
}

/** A piece of Evidence's card, which slides left to show Delete while the Inspection can still change. */
function EvidenceRow({ deletable, label, onDelete, children }: { deletable: boolean; label: string; onDelete: () => void; children: ReactNode }) {
  return deletable ? (
    <SwipeToDelete label={label} onDelete={onDelete}>
      {children}
    </SwipeToDelete>
  ) : (
    <>{children}</>
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
  onSaved,
  onCancel,
}: {
  itemId: string;
  note?: NoteEvidence;
  defects: DefectView[];
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
