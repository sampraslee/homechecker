import { useEffect, useState } from "react";
import type { InspectionSummary } from "../core";
import type { Navigate } from "./App";
import { formatDate, inspectionStatusLabel, inspectionTypeLabel } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function InspectionListScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspections, setInspections] = useState<InspectionSummary[] | null>(null);

  useEffect(() => {
    homeCheck.listInspections().then(setInspections);
  }, [homeCheck]);

  return (
    <main className="screen">
      <header className="bar">
        <h1>Inspections</h1>
        <button type="button" className="link" onClick={() => navigate({ name: "settings" })}>
          Settings
        </button>
      </header>

      <button type="button" className="primary" onClick={() => navigate({ name: "start" })}>
        Start Inspection
      </button>

      {inspections?.length === 0 && <p className="muted">No Inspections on this phone yet.</p>}

      <ul className="cards">
        {inspections?.map((inspection) => (
          <li key={inspection.id}>
            <button type="button" className="card" onClick={() => navigate({ name: "inspection", id: inspection.id })}>
              <span className="card-row">
                <strong>{inspectionTypeLabel[inspection.type]}</strong>
                <span className={`badge ${inspection.status}`}>{inspectionStatusLabel[inspection.status]}</span>
              </span>
              <span>{inspection.addressLine}</span>
              <span className="muted">{formatDate(inspection.startedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
