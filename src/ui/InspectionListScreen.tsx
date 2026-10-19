import { useEffect, useState } from "react";
import type { InspectionSummary } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { formatDate, formatDateTime, inspectionStatusLabel, inspectionTypeLabel } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function InspectionListScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspections, setInspections] = useState<InspectionSummary[] | null>(null);

  useEffect(() => {
    homeCheck.listInspections().then(setInspections);
  }, [homeCheck]);

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        title="Inspections"
        action={
          <button type="button" className="on-band" onClick={() => navigate({ name: "settings" })}>
            Settings
          </button>
        }
      />

      {inspections?.length === 0 && <p className="muted spaced">No Inspections on this phone yet. Start one when you reach the Unit.</p>}

      <ul className="cards">
        {inspections?.map((inspection) => (
          <li key={inspection.id}>
            <button type="button" className="card" onClick={() => navigate({ name: "inspection", id: inspection.id })}>
              {/* The address first: it's what the Inspector looks for. */}
              <span className="card-row">
                <strong>{inspection.addressLine}</strong>
              </span>
              <span className="card-row">
                <span className="muted">
                  {inspectionTypeLabel[inspection.type]}, {formatDate(inspection.startedAt)}
                </span>
                <span className={`badge ${inspection.status}`}>{inspectionStatusLabel[inspection.status]}</span>
              </span>
              {inspection.lastExportedAt ? (
                <span className="muted defect-meta">Exported {formatDateTime(inspection.lastExportedAt)}</span>
              ) : (
                <span className="unexported">Not exported yet: only on this phone</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dock
        action={
          <button type="button" className="primary" onClick={() => navigate({ name: "start" })}>
            Start Inspection
          </button>
        }
      />
    </main>
  );
}
