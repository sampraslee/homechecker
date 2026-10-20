import { useEffect, useState } from "react";
import { ChevronRight, Plus, Settings, TriangleAlert } from "lucide-react";
import type { InspectionSummary } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { formatDate, formatDateTime, inspectionStatusLabel, inspectionTypeLabel, shortAddress } from "./format";
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
            <Settings aria-hidden="true" />
            Settings
          </button>
        }
      />

      {inspections?.length === 0 && <p className="muted spaced">No Inspections on this phone yet. Start one when you reach the Unit.</p>}

      <ul className="cards">
        {inspections?.map((inspection) => (
          <li key={inspection.id}>
            <button type="button" className="card item-card inspection-card" onClick={() => navigate({ name: "inspection", id: inspection.id })}>
              <span className="grow">
                {/* Status first, so Drafts and Completed ones are told apart at a glance; then the address. */}
                <span className={`badge ${inspection.status} card-badge`}>{inspectionStatusLabel[inspection.status]}</span>
                {/* The address and its type and date read as one block. */}
                {/* The short address is what the Inspector looks for; the city tells two "A-12-3"s apart (UX-034). */}
                <span className="card-heading">
                  <strong>{shortAddress(inspection.address)}</strong>
                  <span className="muted">
                    {inspection.address.postcode} {inspection.address.city}
                  </span>
                  <span className="muted">
                    {inspectionTypeLabel[inspection.type]}, {formatDate(inspection.startedAt)}
                  </span>
                </span>
                {inspection.lastExportedAt ? (
                  <span className="muted defect-meta">Exported {formatDateTime(inspection.lastExportedAt)}</span>
                ) : (
                  <span className="unexported">
                    <TriangleAlert className="status-icon" aria-hidden="true" />
                    Only on this phone. Export to keep a copy.
                  </span>
                )}
              </span>
              <ChevronRight className="chevron" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <Dock
        action={
          <button type="button" className="primary" onClick={() => navigate({ name: "start" })}>
            <Plus aria-hidden="true" />
            Start Inspection
          </button>
        }
      />
    </main>
  );
}
