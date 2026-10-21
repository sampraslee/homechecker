import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { formatAddress, type AiWorkLeft, type Inspection, type InspectionTotals } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { ExportPanel } from "./ExportPanel";
import { inspectionTypeLabel, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { useAiChanges } from "./useAiChanges";

/** The page before completing, which can't be undone; once done, the same page offers Export. */
export function CompleteInspectionScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [inspection, setInspection] = useState<Inspection | null | undefined>(undefined);
  const [totals, setTotals] = useState<InspectionTotals | null>(null);
  const [aiWork, setAiWork] = useState<AiWorkLeft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    homeCheck.getInspection(id).then((found) => setInspection(found ?? null));
    homeCheck.inspectionTotals(id).then(setTotals);
  }, [homeCheck, id]);
  useAiChanges(useCallback(() => homeCheck.aiWorkLeft(id).then(setAiWork), [homeCheck, id]));

  if (inspection === undefined || !totals) return null;
  if (inspection === null) {
    return (
      <main className="screen">
        <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title="Inspection not found" />
        <p className="muted">This Inspection is not on this phone.</p>
        <Dock />
      </main>
    );
  }

  const backToInspection = { to: { name: "inspection", id } as const, label: inspectionTypeLabel[inspection.type] };

  if (inspection.status === "completed") {
    return (
      <main className="screen">
        <Band navigate={navigate} back={backToInspection} unit={formatAddress(inspection.address)} title="Inspection completed" />
        <section className="spaced">
          <ExportPanel
            inspectionId={id}
            exported={Boolean(inspection.lastExportedAt)}
            promptToExport={!inspection.lastExportedAt}
            onExported={setInspection}
          />
        </section>
        <Dock />
      </main>
    );
  }

  async function complete() {
    const result = await homeCheck.completeInspection(id);
    if (result.ok) setInspection(result.inspection);
    else setError(refusalMessage[result.reason]);
  }

  const rows: [string, number][] = [
    ["Areas", totals.areas],
    ["Items", totals.items],
    ["Evidence", totals.evidence],
    ["Defects", totals.defects],
  ];
  const notCompleted = totals.areas - totals.areasCompleted;

  return (
    <main className="screen">
      <Band navigate={navigate} back={backToInspection} unit={formatAddress(inspection.address)} title="Complete this Inspection" />
      <section className="spaced">
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
            {notCompleted > 0 && (
              <p className="notice">
                {notCompleted === 1 ? "1 Area is not marked Completed." : `${notCompleted} Areas are not marked Completed.`} You can still
                complete, or keep inspecting.
              </p>
            )}
            {totals.evidence === 0 && (
              <p className="notice">This Inspection has no Evidence: no photos, videos or notes. Check that this is right before you complete it.</p>
            )}
            {totals.defectsWithoutSeverity > 0 && (
              <p className="notice">
                {totals.defectsWithoutSeverity === 1
                  ? "1 Defect has no Severity."
                  : `${totals.defectsWithoutSeverity} Defects have no Severity.`}{" "}
                You can still complete, or keep editing to set them.
              </p>
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
          <button type="button" className="secondary" onClick={() => navigate({ name: "inspection", id }, { up: true })}>
            {totals.areas === 0 ? "Back" : "Keep editing"}
          </button>
          {totals.areas > 0 && (
            <button type="button" className="lock-button" onClick={complete}>
              <Lock aria-hidden="true" />
              Complete
            </button>
          )}
        </div>
      </section>
      <Dock />
    </main>
  );
}
