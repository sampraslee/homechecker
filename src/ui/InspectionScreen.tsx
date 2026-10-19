import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatAddress, type AreaSource, type AreaView, type Inspection } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { formatDateTime, inspectionStatusLabel, inspectionTypeLabel, lockedNotice, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function InspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);
  const [areas, setAreas] = useState<AreaView[]>([]);
  const [adding, setAdding] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  const loadAreas = useCallback(() => homeCheck.listAreas(id).then(setAreas), [homeCheck, id]);
  const loadInspection = useCallback(
    () => homeCheck.getInspection(id).then((found) => setInspection(found ?? null)),
    [homeCheck, id],
  );

  useEffect(() => {
    loadInspection();
    loadAreas();
  }, [loadInspection, loadAreas]);

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
        </>
      )}
    </main>
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
  const itemCount = areas.reduce((total, area) => total + area.itemCount, 0);

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
      <p className="muted">
        Once completed, its Areas, Items, Evidence and Defects can't be added to, changed or removed. It can't be reopened.
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
