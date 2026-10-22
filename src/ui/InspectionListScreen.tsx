import { useEffect, useState } from "react";
import { Plus, Settings, TriangleAlert } from "lucide-react";
import type { InspectionSummary, InspectionType } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { defectCountLabel } from "./defectCount";
import { formatDate, inspectionStatusLabel, inspectionTypeLabel } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { unitHeading } from "./unitHeading";

const TABS: { type: InspectionType; label: string; empty: string }[] = [
  { type: "move-in", label: "Move-ins", empty: "No Move-ins on this phone yet. Start one when you reach the Unit." },
  { type: "move-out", label: "Move-outs", empty: "No Move-outs on this phone yet." },
];

/** Kept across visits, so coming back from a Move-out lands on Move-outs again. */
let lastTab: InspectionType = "move-in";

export function InspectionListScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspections, setInspections] = useState<InspectionSummary[] | null>(null);
  const [tab, setTab] = useState(lastTab);

  useEffect(() => {
    homeCheck.listInspections().then(setInspections);
  }, [homeCheck]);

  const shown = inspections?.filter((inspection) => inspection.type === tab);
  const activeTab = TABS.find((each) => each.type === tab)!;

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

      <div className="tabs" role="tablist">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={tab === type}
            onClick={() => {
              lastTab = type;
              setTab(type);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {shown?.length === 0 && <p className="muted spaced">{activeTab.empty}</p>}

      <ul className="cards" role="tabpanel">
        {shown?.map((inspection) => (
          <li key={inspection.id}>
            <button type="button" className="card inspection-card" onClick={() => navigate({ name: "inspection", id: inspection.id })}>
              {/* A gray box stands in for the photo of the building until one can be taken. */}
              <span className="building-photo">
                <span className={`badge ${inspection.status}`}>{inspectionStatusLabel[inspection.status]}</span>
              </span>
              <span className="card-heading">
                <strong className="card-title">{unitHeading(inspection.address)}</strong>
                <span className="card-meta muted">
                  <span>{formatDate(inspection.startedAt)}</span>
                  <span className="meta-dot" aria-hidden="true" />
                  <span className={inspection.defectCount > 0 ? "defect-count" : undefined}>{defectCountLabel(inspection.defectCount)}</span>
                </span>
              </span>
              {inspection.status === "completed" && !inspection.lastExportedAt && (
                <span className="unexported">
                  <TriangleAlert className="status-icon" aria-hidden="true" />
                  Only on this phone. Export to keep a copy.
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dock
        floating
        action={
          <button type="button" className="primary" onClick={() => navigate({ name: "start", type: tab })}>
            <Plus aria-hidden="true" />
            New {inspectionTypeLabel[tab]}
          </button>
        }
      />
    </main>
  );
}
