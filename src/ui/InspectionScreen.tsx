import { useEffect, useState } from "react";
import { formatAddress, type Inspection } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { formatDateTime, inspectionStatusLabel, inspectionTypeLabel } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function InspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);

  useEffect(() => {
    homeCheck.getInspection(id).then((found) => setInspection(found ?? null));
  }, [homeCheck, id]);

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
        </>
      )}
    </main>
  );
}
