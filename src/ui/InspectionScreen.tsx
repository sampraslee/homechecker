import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatAddress, type AiWorkLeft, type AreaSource, type AreaView, type Inspection, type UnreviewedAiSuggestionView } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { formatDate, formatDateTime, inspectionStatusLabel, inspectionTypeLabel, lockedNotice, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { shareOrDownload, TapTooOldError, type ShareOutcome } from "./shareFile";
import { useAiChanges } from "./useAiChanges";

export function InspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);
  const [areas, setAreas] = useState<AreaView[]>([]);
  const [adding, setAdding] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [toReview, setToReview] = useState<UnreviewedAiSuggestionView[]>([]);
  const [linkedMoveIn, setLinkedMoveIn] = useState<Inspection | undefined>(undefined);

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
    if (linkedMoveInId) homeCheck.getInspection(linkedMoveInId).then(setLinkedMoveIn);
  }, [homeCheck, linkedMoveInId]);

  // Also reloads as AI Suggestions arrive or are reviewed.
  useAiChanges(useCallback(() => homeCheck.listUnreviewedAiSuggestions(id).then(setToReview), [homeCheck, id]));

  const locked = inspection?.status === "completed";

  return (
    <main className="screen">
      <BackBar navigate={navigate} />

      {inspection === null && <p className="muted">This Inspection is not on this phone.</p>}

      {inspection && (
        <>
          <h1>
            {inspectionTypeLabel[inspection.type]}{" "}
            <span className={`badge ${inspection.status}`}>{inspectionStatusLabel[inspection.status]}</span>
          </h1>
          <dl className="details">
            <dt>Unit</dt>
            <dd>{formatAddress(inspection.address)}</dd>
            {inspection.type === "move-out" && (
              <>
                <dt>Move-in</dt>
                <dd>
                  {!linkedMoveInId
                    ? "Not linked"
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
          {locked && <p className="notice">{lockedNotice}</p>}

          <h2>Areas</h2>
          {areas.length === 0 && <p className="muted">No Areas yet.</p>}
          <ul className="cards">
            {areas.map((area) => (
              <li key={area.id}>
                <button type="button" className="card" onClick={() => navigate({ name: "area", id: area.id })}>
                  <span className="card-row">
                    <strong>{area.name}</strong>
                    <span className="muted">
                      {area.itemCount} {area.itemCount === 1 ? "Item" : "Items"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {toReview.length > 0 && (
            <>
              <h2>AI Suggestions to review ({toReview.length})</h2>
              <ul className="cards">
                {toReview.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button type="button" className="card" onClick={() => navigate({ name: "item", id: suggestion.itemId })}>
                      <span className="card-row">
                        <strong>{suggestion.defectTypeName}</strong>
                        <span className="badge confidence">{suggestion.confidence}</span>
                      </span>
                      <span className="muted defect-meta">
                        {suggestion.areaName} · {suggestion.itemName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {locked ? null : adding ? (
            <AddAreaPanel
              inspectionId={id}
              onAdded={() => {
                setAdding(false);
                loadAreas();
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button type="button" className="primary spaced" onClick={() => setAdding(true)}>
              Add Area
            </button>
          )}

          {!locked &&
            (confirmingComplete ? (
              <CompletePanel
                inspectionId={id}
                areas={areas}
                onCompleted={() => {
                  setConfirmingComplete(false);
                  loadInspection();
                }}
                onCancel={() => setConfirmingComplete(false)}
              />
            ) : (
              <button
                type="button"
                className="secondary spaced"
                onClick={() => {
                  setAdding(false);
                  setConfirmingComplete(true);
                }}
              >
                Complete Inspection
              </button>
            ))}

          <ExportPanel inspectionId={id} onExported={setInspection} />
        </>
      )}
    </main>
  );
}

const exportOutcomeMessage: Record<ShareOutcome, string> = {
  shared: "Export shared.",
  cancelled: "Export ready; sharing was cancelled.",
  downloaded: "Export downloaded.",
};

/** Builds the zip and hands it to the share menu. Works on Draft and Completed Inspections. */
function ExportPanel({ inspectionId, onExported }: { inspectionId: string; onExported: (inspection: Inspection) => void }) {
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

  return (
    <section className="spaced">
      {ready ? (
        <>
          <p className="muted">The export is ready. Tap to open the share menu.</p>
          <button type="button" className="primary" onClick={() => share(ready, true)}>
            Share export
          </button>
        </>
      ) : (
        <button type="button" className="secondary" onClick={exportNow} disabled={exporting}>
          {exporting ? "Exporting…" : "Export"}
        </button>
      )}
      {message && <p className="muted">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

/** The confirmation step before completing; completing can't be undone. */
function CompletePanel({
  inspectionId,
  areas,
  onCompleted,
  onCancel,
}: {
  inspectionId: string;
  areas: AreaView[];
  onCompleted: () => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [error, setError] = useState<string | null>(null);
  const [aiWork, setAiWork] = useState<AiWorkLeft | null>(null);
  const itemCount = areas.reduce((total, area) => total + area.itemCount, 0);

  useAiChanges(useCallback(() => homeCheck.aiWorkLeft(inspectionId).then(setAiWork), [homeCheck, inspectionId]));

  async function complete() {
    const result = await homeCheck.completeInspection(inspectionId);
    if (result.ok) onCompleted();
    else setError(refusalMessage[result.reason]);
  }

  return (
    <section className="panel">
      <h2>Complete this Inspection?</h2>
      <p>
        {areas.length} {areas.length === 1 ? "Area" : "Areas"}, {itemCount} {itemCount === 1 ? "Item" : "Items"} recorded.
      </p>
      {aiWork && (
        <p>
          Photos waiting for AI: {aiWork.waitingForAi}
          <br />
          AI Suggestions not reviewed: {aiWork.unreviewedAiSuggestions}
        </p>
      )}
      <p className="muted">
        Once completed, its Areas, Items, Evidence and Defects can't be added to, changed or removed. It can't be reopened.
        Photos still waiting are sent to the AI, and AI Suggestions can still be reviewed.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onCancel}>
          Keep editing
        </button>
        <button type="button" className="primary" onClick={complete}>
          Complete Inspection
        </button>
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
  onAdded: () => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [standardAreas, setStandardAreas] = useState<{ id: string; name: string }[]>([]);
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    homeCheck.listStandardAreas().then(setStandardAreas);
  }, [homeCheck]);

  async function add(source: AreaSource) {
    const result = await homeCheck.addArea(inspectionId, source);
    if (result.ok) onAdded();
    else setError(refusalMessage[result.reason]);
  }

  function addCustom(event: FormEvent) {
    event.preventDefault();
    add({ customName });
  }

  return (
    <section className="panel">
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
          Or a custom name
          <input value={customName} onChange={(event) => setCustomName(event.target.value)} />
          {error && <span className="error">{error}</span>}
        </label>
        <button type="submit" className="secondary">
          Add custom Area
        </button>
      </form>
    </section>
  );
}
