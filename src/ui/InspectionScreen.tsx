import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronRight, DoorOpen, Lock, Plus, Share, Sparkles, Trash2 } from "lucide-react";
import { formatAddress, type AiWorkLeft, type AreaSource, type AreaView, type Inspection, type InspectionTotals, type UnreviewedAiSuggestionView } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { formatDate, formatDateTime, inspectionStatusLabel, inspectionTypeLabel, lockedNotice, refusalMessage, shortAddress } from "./format";
import { useBackCloses } from "./backCloses";
import { useHomeCheck } from "./homeCheckContext";
import { scrollIntoViewGently } from "./scroll";
import { shareOrDownload, TapTooOldError, type ShareOutcome } from "./shareFile";
import { useAiChanges } from "./useAiChanges";

export function InspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);
  const [areas, setAreas] = useState<AreaView[]>([]);
  const [adding, setAdding] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  /** Completed on this visit and not exported since, so the Inspector is prompted to export. */
  const [justCompleted, setJustCompleted] = useState(false);
  const [toReview, setToReview] = useState<UnreviewedAiSuggestionView[]>([]);
  /** `null`: the linked Move-in was deleted from this phone. */
  const [linkedMoveIn, setLinkedMoveIn] = useState<Inspection | null | undefined>(undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadAreas = useCallback(() => homeCheck.listAreas(id).then(setAreas), [homeCheck, id]);
  const loadInspection = useCallback(
    () => homeCheck.getInspection(id).then((found) => setInspection(found ?? null)),
    [homeCheck, id],
  );

  useEffect(() => {
    loadInspection();
    loadAreas();
  }, [loadInspection, loadAreas]);

  const linkedMoveInId = inspection?.linkedMoveInId;
  useEffect(() => {
    if (linkedMoveInId) homeCheck.getInspection(linkedMoveInId).then((found) => setLinkedMoveIn(found ?? null));
  }, [homeCheck, linkedMoveInId]);

  // Also reloads as AI Suggestions arrive or are reviewed.
  useAiChanges(useCallback(() => homeCheck.listUnreviewedAiSuggestions(id).then(setToReview), [homeCheck, id]));

  const locked = inspection?.status === "completed";

  if (inspection === undefined) return null;
  if (inspection === null) {
    return (
      <main className="screen">
        <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title="Inspection not found" />
        <p className="muted">This Inspection is not on this phone.</p>
        <Dock />
      </main>
    );
  }

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={{ to: { name: "list" }, label: "Inspections" }}
        unit={shortAddress(inspection.address)}
        title={inspectionTypeLabel[inspection.type]}
        action={<span className={`badge ${inspection.status}`}>{inspectionStatusLabel[inspection.status]}</span>}
      >
        {locked && <p className="notice">{lockedNotice}</p>}
      </Band>

      <dl className="details">
        <dt>Unit</dt>
        <dd>{formatAddress(inspection.address)}</dd>
        {inspection.type === "move-out" && (
          <>
            <dt>Move-in</dt>
            <dd>
              {!linkedMoveInId
                ? "Not linked"
                : linkedMoveIn === null
                  ? "Deleted from this phone"
                  : linkedMoveIn && `${formatDate(linkedMoveIn.startedAt)}, by ${linkedMoveIn.inspectorName}`}
            </dd>
          </>
        )}
        <dt>Inspector</dt>
        <dd>{inspection.inspectorName}</dd>
        <dt>Started</dt>
        <dd>{formatDateTime(inspection.startedAt)}</dd>
        {inspection.completedAt && (
          <>
            <dt>Completed</dt>
            <dd>{formatDateTime(inspection.completedAt)}</dd>
          </>
        )}
        <dt>Last exported</dt>
        <dd>{inspection.lastExportedAt ? formatDateTime(inspection.lastExportedAt) : "Never"}</dd>
      </dl>

      {toReview.length > 0 && (
        <>
          <div className="section-head">
            <h2>AI Suggestions</h2>
            <span className="count">{toReview.length} to review</span>
          </div>
          <ul className="cards">
            {toReview.map((suggestion) => (
              <li key={suggestion.id}>
                <button type="button" className="card item-card ai-suggestion" onClick={() => navigate({ name: "item", id: suggestion.itemId })}>
                  <Sparkles className="row-icon ai" aria-hidden="true" />
                  <span className="grow">
                    <strong>{suggestion.defectTypeName}</strong>
                    <span className="summary">
                      {suggestion.itemName} in {suggestion.areaName}
                    </span>
                  </span>
                  <ChevronRight className="chevron" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="section-head">
        <h2>Areas</h2>
        <span className="count">{areas.length > 0 && areas.length}</span>
      </div>
      {areas.length === 0 && (
        <p className="muted">{locked ? "No Areas." : "Add the rooms you'll inspect, starting from the front door."}</p>
      )}
      <ul className="cards">
        {areas.map((area) => (
          <li key={area.id}>
            <button type="button" className="card item-card" onClick={() => navigate({ name: "area", id: area.id })}>
              <DoorOpen className="row-icon" aria-hidden="true" />
              <span className="grow">
                <strong>{area.name}</strong>
                <span className="summary">{area.itemCount === 0 ? "No Items yet" : area.itemCount === 1 ? "1 Item" : `${area.itemCount} Items`}</span>
              </span>
              <ChevronRight className="chevron" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {!locked && adding && (
        <AddAreaPanel
          inspectionId={id}
          // Straight into the new Area, ready to add its Items.
          onAdded={(areaId) => navigate({ name: "area", id: areaId, addingItem: true })}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* The end of an Inspection, together: export, complete, and (set apart) delete. */}
      <div className="section-head">
        <h2>Finish</h2>
      </div>
      <ExportPanel
        inspectionId={id}
        promptToExport={justCompleted}
        onExported={(exported) => {
          setJustCompleted(false);
          setInspection(exported);
        }}
      />

      {/* Kept apart from Export: completing locks the Inspection for good. */}
      {!locked &&
        (confirmingComplete ? (
          <CompletePanel
            inspectionId={id}
            onCompleted={() => {
              setConfirmingComplete(false);
              setJustCompleted(true);
              loadInspection();
            }}
            onCancel={() => setConfirmingComplete(false)}
          />
        ) : (
          <section className="lock-zone">
            <p className="muted">When every Area is done, complete the Inspection. It is then locked and can't be changed.</p>
            <button
              type="button"
              className="lock-button"
              onClick={() => {
                setAdding(false);
                setConfirmingComplete(true);
              }}
            >
              <Lock aria-hidden="true" />
              Complete Inspection
            </button>
          </section>
        ))}

      {/* Rare and permanent, so last on the screen and confirmed. */}
      {confirmingDelete ? (
        <DeletePanel
          inspection={inspection}
          onDeleted={() => navigate({ name: "list" }, { up: true })}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : (
        <section className="delete-zone">
          <button
            type="button"
            className="link danger"
            onClick={() => {
              setAdding(false);
              setConfirmingComplete(false);
              setConfirmingDelete(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete Inspection
          </button>
        </section>
      )}

      <Dock
        storage
        action={
          !locked &&
          !adding &&
          !confirmingComplete &&
          !confirmingDelete && (
            <button type="button" className="primary" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" />
              Add Area
            </button>
          )
        }
      />
    </main>
  );
}

const exportOutcomeMessage: Record<ShareOutcome, string> = {
  shared: "Export shared.",
  cancelled: "Sharing cancelled. Tap Export to share it again.",
  downloaded: "Export downloaded.",
};

/** Builds the zip and hands it to the share menu. Works on Draft and Completed Inspections. */
function ExportPanel({
  inspectionId,
  promptToExport,
  onExported,
}: {
  inspectionId: string;
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
      {message && <p className="muted">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}

/** The confirmation before deleting an Inspection from the phone for good. */
function DeletePanel({ inspection, onDeleted, onCancel }: { inspection: Inspection; onDeleted: () => void; onCancel: () => void }) {
  const homeCheck = useHomeCheck();
  useBackCloses(onCancel);
  const [totals, setTotals] = useState<InspectionTotals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const { lastExportedAt } = inspection;

  useEffect(() => {
    homeCheck.inspectionTotals(inspection.id).then(setTotals);
  }, [homeCheck, inspection.id]);
  useEffect(() => {
    scrollIntoViewGently(panel.current);
  }, []);

  async function remove() {
    const result = await homeCheck.deleteInspection(inspection.id);
    if (result.ok) onDeleted();
    else setError(refusalMessage[result.reason]);
  }

  if (!totals) return null;

  return (
    <section className="panel confirm-card" ref={panel}>
      <h2>Delete this Inspection?</h2>
      <p>
        This permanently deletes it from this phone, with {totals.areas} {totals.areas === 1 ? "Area" : "Areas"}, {totals.items}{" "}
        {totals.items === 1 ? "Item" : "Items"}, {totals.evidence} Evidence and {totals.defects}{" "}
        {totals.defects === 1 ? "Defect" : "Defects"}. It can't be undone.
      </p>
      {!lastExportedAt ? (
        <p className="notice">This Inspection has never been exported, so this phone has the only copy. Export it first if you need it.</p>
      ) : (
        <p className="muted">Last exported {formatDateTime(lastExportedAt)}. Anything changed since then is lost.</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onCancel}>
          Keep Inspection
        </button>
        <button type="button" className="danger-button" onClick={remove}>
          {lastExportedAt ? "Delete Inspection" : "Delete without exporting"}
        </button>
      </div>
    </section>
  );
}

/** The confirmation step before completing; completing can't be undone. */
function CompletePanel({
  inspectionId,
  onCompleted,
  onCancel,
}: {
  inspectionId: string;
  onCompleted: () => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  useBackCloses(onCancel);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<InspectionTotals | null>(null);
  const [aiWork, setAiWork] = useState<AiWorkLeft | null>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    homeCheck.inspectionTotals(inspectionId).then(setTotals);
  }, [homeCheck, inspectionId]);
  useEffect(() => {
    scrollIntoViewGently(panel.current);
  }, []);
  useAiChanges(useCallback(() => homeCheck.aiWorkLeft(inspectionId).then(setAiWork), [homeCheck, inspectionId]));

  async function complete() {
    const result = await homeCheck.completeInspection(inspectionId);
    if (result.ok) onCompleted();
    else setError(refusalMessage[result.reason]);
  }

  if (!totals) return null;
  const rows: [string, number][] = [
    ["Areas", totals.areas],
    ["Items", totals.items],
    ["Evidence", totals.evidence],
    ["Defects", totals.defects],
  ];

  return (
    <section className="panel" ref={panel}>
      <h2>Complete this Inspection?</h2>
      <dl className="totals">
        {rows.map(([label, count]) => (
          <div key={label} className={count === 0 ? "zero" : undefined}>
            <dt>{label}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
      {totals.areas === 0 ? (
        <p className="notice">This Inspection has no Areas, so there is nothing to complete. Add the Areas you inspected first.</p>
      ) : (
        <>
          {totals.evidence === 0 && (
            <p className="notice">This Inspection has no Evidence: no photos, videos or notes. Check that this is right before you complete it.</p>
          )}
          {aiWork && (aiWork.waitingForAi > 0 || aiWork.unreviewedAiSuggestions > 0) && (
            <p>
              Photos waiting for AI: {aiWork.waitingForAi}
              <br />
              AI Suggestions not reviewed: {aiWork.unreviewedAiSuggestions}
            </p>
          )}
          <p className="muted">
            Completing locks this Inspection: nothing in it can be added, changed or removed, and it can't be reopened. AI
            Suggestions can still be reviewed.
          </p>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onCancel}>
          {totals.areas === 0 ? "Back" : "Keep editing"}
        </button>
        {totals.areas > 0 && (
          <button type="button" className="lock-button" onClick={complete}>
            Complete
          </button>
        )}
      </div>
    </section>
  );
}

function AddAreaPanel({
  inspectionId,
  onAdded,
  onCancel,
}: {
  inspectionId: string;
  onAdded: (areaId: string) => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  useBackCloses(onCancel);
  const [standardAreas, setStandardAreas] = useState<{ id: string; name: string }[]>([]);
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);

  // The panel opens below the Areas, often off screen.
  useEffect(() => {
    scrollIntoViewGently(panel.current);
  }, []);

  useEffect(() => {
    homeCheck.listStandardAreas().then(setStandardAreas);
  }, [homeCheck]);

  async function add(source: AreaSource) {
    const result = await homeCheck.addArea(inspectionId, source);
    if (result.ok) onAdded(result.area.id);
    else setError(refusalMessage[result.reason]);
  }

  function addCustom(event: FormEvent) {
    event.preventDefault();
    add({ customName });
  }

  return (
    <section className="panel" ref={panel}>
      <div className="card-row">
        <h2>Add Area</h2>
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="chips">
        {standardAreas.map((area) => (
          <button key={area.id} type="button" className="chip" onClick={() => add({ standardAreaId: area.id })}>
            {area.name}
          </button>
        ))}
      </div>
      <form className="form" onSubmit={addCustom} noValidate>
        <label>
          Area not in the list
          <input value={customName} onChange={(event) => setCustomName(event.target.value)} />
          {error && <span className="error" role="alert">{error}</span>}
        </label>
        <button type="submit" className="secondary">
          Add this Area
        </button>
      </form>
    </section>
  );
}
