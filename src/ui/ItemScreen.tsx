import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { DefectView, Evidence, ItemView } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { DefectEditor, DefectTypePicker, type PickedDefectType } from "./DefectPanels";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { PhotoImage } from "./PhotoImage";

type DefectPanel =
  | { mode: "pick" }
  | { mode: "add"; defectType: PickedDefectType }
  | { mode: "edit"; defectId: string; notice?: string };

/** An Item has at most one Defect per Defect Type, so picking one it already has opens that Defect. */
function alreadyRecorded(defectId: string, defectType: PickedDefectType): DefectPanel {
  return { mode: "edit", defectId, notice: `This Item already has ${defectType.name}. Add to this Defect instead.` };
}

export function ItemScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [item, setItem] = useState<ItemView | null | undefined>(undefined);
  const [photos, setPhotos] = useState<Evidence[]>([]);
  const [defects, setDefects] = useState<DefectView[]>([]);
  const [defectPanel, setDefectPanel] = useState<DefectPanel | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [viewing, setViewing] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setItem((await homeCheck.getItem(id)) ?? null);
    setPhotos(await homeCheck.listEvidence(id));
    setDefects(await homeCheck.listDefects(id));
  }, [homeCheck, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function capture(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setSaving(true);
    setError(null);
    let saved = 0;
    try {
      for (const file of files) {
        const result = await homeCheck.addPhoto(id, file);
        if (result.ok) saved++;
        else setError(refusalMessage[result.reason]);
      }
    } finally {
      // Free the button even if a save throws, so the Inspector can try again.
      setSaving(false);
      setSavedCount(saved);
      load();
    }
  }

  function closeDefectPanel() {
    setDefectPanel(null);
    load();
  }

  if (item === undefined) return null;
  if (item === null) {
    return (
      <main className="screen">
        <BackBar navigate={navigate} />
        <p className="muted">This Item is not on this phone.</p>
      </main>
    );
  }

  return (
    <main className="screen">
      <BackBar navigate={navigate} to={{ name: "area", id: item.areaId }} label="Area" />
      <h1>{item.displayName}</h1>

      <h2>Photos</h2>
      {photos.length === 0 && <p className="muted">No photos yet.</p>}
      <ul className="thumbnails">
        {photos.map((photo) => (
          <li key={photo.id}>
            <button type="button" className="thumbnail" onClick={() => setViewing(photo)} aria-label="Open photo">
              <PhotoImage evidenceId={photo.id} version="thumbnail" alt="" />
            </button>
          </li>
        ))}
      </ul>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={capture}
      />
      <button type="button" className="primary spaced" disabled={saving} onClick={() => cameraInput.current?.click()}>
        {saving ? "Saving…" : "Take photo"}
      </button>
      {error && <p className="error">{error}</p>}
      {!saving && savedCount > 0 && (
        <p className="muted" role="status">
          {savedCount === 1 ? "Photo saved on device." : `${savedCount} photos saved on device.`}
        </p>
      )}

      <h2>Defects{defects.length > 0 && ` (${defects.length})`}</h2>
      {defects.length === 0 && <p className="muted">No Defects recorded.</p>}
      <ul className="cards">
        {defects.map((defect) => (
          <li key={defect.id}>
            <button type="button" className="card" onClick={() => setDefectPanel({ mode: "edit", defectId: defect.id })}>
              <span className="card-row">
                <strong>{defect.defectTypeName}</strong>
                <span className="muted defect-meta">
                  {defect.evidenceIds.length} {defect.evidenceIds.length === 1 ? "photo" : "photos"}
                </span>
              </span>
              <span className="muted defect-meta">
                {defect.defectTypeCode} · {defect.categoryName}
              </span>
              {defect.note && <span>{defect.note}</span>}
            </button>
          </li>
        ))}
      </ul>

      {defectPanel === null && (
        <button type="button" className="primary spaced" onClick={() => setDefectPanel({ mode: "pick" })}>
          Add Defect
        </button>
      )}
      {defectPanel?.mode === "pick" && (
        <DefectTypePicker
          itemId={id}
          itemName={item.name}
          recordedCodes={defects.map((defect) => defect.defectTypeCode)}
          onPicked={(defectType) => {
            const existing = defects.find((defect) => defect.defectTypeCode === defectType.code);
            setDefectPanel(existing ? alreadyRecorded(existing.id, defectType) : { mode: "add", defectType });
          }}
          onCancel={() => setDefectPanel(null)}
        />
      )}
      {defectPanel?.mode === "add" && (
        <DefectEditor
          key={defectPanel.defectType.code}
          itemId={id}
          photos={photos}
          defectType={defectPanel.defectType}
          onSaved={closeDefectPanel}
          onDuplicate={(existingDefectId) => setDefectPanel(alreadyRecorded(existingDefectId, defectPanel.defectType))}
          onCancel={() => setDefectPanel(null)}
        />
      )}
      {defectPanel?.mode === "edit" && (
        <ExistingDefectEditor
          key={defectPanel.defectId}
          defectId={defectPanel.defectId}
          itemId={id}
          photos={photos}
          notice={defectPanel.notice}
          onSaved={closeDefectPanel}
          onCancel={() => setDefectPanel(null)}
        />
      )}

      {viewing && (
        <PhotoViewer
          evidence={viewing}
          onClose={() => setViewing(null)}
          onDeleted={() => {
            setViewing(null);
            setSavedCount(0);
            load();
          }}
        />
      )}
    </main>
  );
}

function PhotoViewer({ evidence, onClose, onDeleted }: { evidence: Evidence; onClose: () => void; onDeleted: () => void }) {
  const homeCheck = useHomeCheck();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const result = await homeCheck.deleteEvidence(evidence.id);
    if (result.ok) onDeleted();
    else setError(refusalMessage[result.reason]);
  }

  return (
    <div className="viewer" role="dialog" aria-label="Photo">
      <div className="viewer-bar">
        <button type="button" className="link on-dark" onClick={onClose}>
          Close
        </button>
        {confirming ? (
          <span className="button-row">
            <button type="button" className="link on-dark" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button type="button" className="link danger-on-dark" onClick={remove}>
              Delete photo
            </button>
          </span>
        ) : (
          <button type="button" className="link danger-on-dark" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <PhotoImage evidenceId={evidence.id} version="original" alt="Photo" className="viewer-image" />
    </div>
  );
}

function ExistingDefectEditor({
  defectId,
  ...props
}: { defectId: string; itemId: string; photos: Evidence[]; notice?: string; onSaved: () => void; onCancel: () => void }) {
  const homeCheck = useHomeCheck();
  const [defect, setDefect] = useState<DefectView | null>(null);

  useEffect(() => {
    homeCheck.getDefect(defectId).then((found) => setDefect(found ?? null));
  }, [homeCheck, defectId]);

  return defect && <DefectEditor {...props} defect={defect} />;
}
