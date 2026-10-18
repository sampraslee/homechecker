import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Evidence, ItemView, PhotoVersion } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function ItemScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [item, setItem] = useState<ItemView | null | undefined>(undefined);
  const [photos, setPhotos] = useState<Evidence[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [viewing, setViewing] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setItem((await homeCheck.getItem(id)) ?? null);
    setPhotos(await homeCheck.listEvidence(id));
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
    for (const file of files) {
      const result = await homeCheck.addPhoto(id, file);
      if (result.ok) saved++;
      else setError(refusalMessage[result.reason]);
    }
    setSaving(false);
    setSavedCount(saved);
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

function PhotoImage({
  evidenceId,
  version,
  alt,
  className,
}: {
  evidenceId: string;
  version: PhotoVersion;
  alt: string;
  className?: string;
}) {
  const homeCheck = useHomeCheck();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    homeCheck.getPhoto(evidenceId, version).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [homeCheck, evidenceId, version]);

  return url ? <img src={url} alt={alt} className={className} /> : null;
}
