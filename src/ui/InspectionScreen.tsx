import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, DoorOpen, Lock, Trash2 } from "lucide-react";
import { formatAddress, type AreaView, type Inspection, type InspectionTotals } from "../core";
import type { Navigate } from "./App";
import { AddAreaFlow } from "./AddAreaFlow";
import { Band } from "./Band";
import { unitHeading } from "./unitHeading";
import { LockedNotice } from "./LockedNotice";
import { Dock } from "./Dock";
import { StepFooter } from "./StepFooter";
import { ExportPanel } from "./ExportPanel";
import { formatDate, formatDateTime, inspectionStatusLabel, inspectionTypeLabel, refusalMessage } from "./format";
import { useBackCloses } from "./backCloses";
import { useHomeCheck } from "./homeCheckContext";
import { scrollIntoViewGently } from "./scroll";
import { useAiChanges } from "./useAiChanges";

export function InspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);
  const [areas, setAreas] = useState<AreaView[]>([]);
  const [adding, setAdding] = useState(false);
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
  }, [loadInspection]);

  const linkedMoveInId = inspection?.linkedMoveInId;
  useEffect(() => {
    if (linkedMoveInId) homeCheck.getInspection(linkedMoveInId).then((found) => setLinkedMoveIn(found ?? null));
  }, [homeCheck, linkedMoveInId]);

  // The "to review" badges on the Areas follow AI Suggestions as they arrive or are reviewed.
  useAiChanges(loadAreas);

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

  // Adding an Area takes the whole screen, a step at a time.
  if (adding && !locked) {
    return <AddAreaFlow inspectionId={id} unit={formatAddress(inspection.address)} navigate={navigate} onCancel={() => setAdding(false)} />;
  }

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={{ to: { name: "list" }, label: "Inspections" }}
        title={inspectionTypeLabel[inspection.type]}
        // Completed shows as the "Completed · Locked" pill below, so the badge is only for a Draft.
        action={!locked && <span className={`badge ${inspection.status}`}>{inspectionStatusLabel[inspection.status]}</span>}
      >
        {locked && <LockedNotice />}
      </Band>

      {/* Who and when, in one short line, so the Areas start near the top (UX-032). */}
      <p className="inspection-meta">
        {[
          inspection.inspectorName,
          `Started ${formatDateTime(inspection.startedAt)}`,
          inspection.completedAt && `Completed ${formatDateTime(inspection.completedAt)}`,
          inspection.lastExportedAt ? `Exported ${formatDateTime(inspection.lastExportedAt)}` : "Never exported",
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {inspection.type === "move-out" && (
        <p className="inspection-meta">
          {!linkedMoveInId
            ? "Not linked to a Move-in"
            : linkedMoveIn === null
              ? "Linked Move-in deleted from this phone"
              : linkedMoveIn && `Linked to the Move-in of ${formatDate(linkedMoveIn.startedAt)}, by ${linkedMoveIn.inspectorName}`}
        </p>
      )}

      <h2 className="unit-heading">{unitHeading(inspection.address)}</h2>
      <div className="section-head">
        <h2>Areas</h2>
        <span className="count">{areas.length > 0 && `${areas.filter((area) => area.completedAt).length} of ${areas.length} Completed`}</span>
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
                {area.completedAt && <span className="badge completed card-badge">Completed</span>}
                {area.aiToReview > 0 && <span className="badge unreviewed card-badge">{area.aiToReview} to review</span>}
                <span className="summary">{area.itemCount === 0 ? "No Items yet" : area.itemCount === 1 ? "1 Item" : `${area.itemCount} Items`}</span>
              </span>
              <ChevronRight className="chevron" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {/* The end of an Inspection: complete it (or, once Completed, export it), and delete it, set apart. */}
      {locked && (
        <div className="section-head">
          <h2>Export</h2>
        </div>
      )}
      {locked ? (
        <ExportPanel
          inspectionId={id}
          exported={Boolean(inspection.lastExportedAt)}
          promptToExport={false}
          onExported={setInspection}
        />
      ) : (
        <section className="lock-zone">
          <p className="muted">When every Area is done, complete the Inspection. It is then locked and can't be changed.</p>
          <button
            type="button"
            className="lock-button"
            onClick={() => navigate({ name: "complete", id })}
          >
            <Lock aria-hidden="true" />
            Complete Inspection
          </button>
        </section>
      )}

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
              setConfirmingDelete(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete Inspection
          </button>
        </section>
      )}

      <Dock
        action={
          <StepFooter
            onBack={() => navigate({ name: "list" }, { up: true })}
            onNext={!locked && !confirmingDelete ? () => setAdding(true) : undefined}
            nextLabel="Add Area"
          />
        }
      />
    </main>
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
