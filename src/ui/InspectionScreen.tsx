import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatAddress, type AreaSource, type AreaView, type Inspection } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { formatDateTime, inspectionStatusLabel, inspectionTypeLabel, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function InspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);
  const [areas, setAreas] = useState<AreaView[]>([]);
  const [adding, setAdding] = useState(false);

  const loadAreas = useCallback(() => homeCheck.listAreas(id).then(setAreas), [homeCheck, id]);

  useEffect(() => {
    homeCheck.getInspection(id).then((found) => setInspection(found ?? null));
    loadAreas();
  }, [homeCheck, id, loadAreas]);

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
          </dl>

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

          {adding ? (
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
        </>
      )}
    </main>
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
