import { useEffect, useState, type FormEvent } from "react";
import type { DefectCategory, DefectChoices, DefectType, DefectView, Evidence } from "../core";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { PhotoImage } from "./PhotoImage";

export type PickedDefectType = DefectType & { noteRequired: boolean };

/** Defect Category, then Defect Type. The Item's relevant Categories come first. */
export function DefectTypePicker({
  itemId,
  itemName,
  recordedCodes,
  onPicked,
  onCancel,
}: {
  itemId: string;
  itemName: string;
  /** Defect Types this Item already has, marked so the Inspector can see them. */
  recordedCodes: string[];
  onPicked: (defectType: PickedDefectType) => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [choices, setChoices] = useState<DefectChoices | null>(null);
  const [category, setCategory] = useState<DefectCategory | null>(null);

  useEffect(() => {
    homeCheck.defectChoices(itemId).then((result) => {
      if (result.ok) setChoices(result);
    });
  }, [homeCheck, itemId]);

  const chips = (categories: DefectCategory[]) => (
    <div className="chips">
      {categories.map((option) => (
        <button key={option.code} type="button" className="chip" onClick={() => setCategory(option)}>
          {option.name}
        </button>
      ))}
    </div>
  );

  return (
    <section className="panel">
      <div className="card-row">
        <h2>{category ? category.name : "Add Defect"}</h2>
        <button type="button" className="link" onClick={category ? () => setCategory(null) : onCancel}>
          {category ? "‹ Categories" : "Cancel"}
        </button>
      </div>

      {category ? (
        <ul className="rows">
          {category.defectTypes.map((defectType) => (
            <li key={defectType.code}>
              <button
                type="button"
                className="type-row"
                onClick={() => onPicked({ ...defectType, noteRequired: !!category.noteRequired })}
              >
                <span>
                  {defectType.name} <span className="muted defect-meta">{defectType.code}</span>
                </span>
                {recordedCodes.includes(defectType.code) && <span className="badge defects">Recorded</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        choices && (
          <>
            {choices.shownFirst.length > 0 && (
              <>
                <h3>Usual for {itemName}</h3>
                {chips(choices.shownFirst)}
              </>
            )}
            <h3>{choices.shownFirst.length > 0 ? "All other Categories" : "All Categories"}</h3>
            {chips(choices.others)}
          </>
        )
      )}
    </section>
  );
}

/** Note and linked photos for a new Defect (`defectType`) or an existing one (`defect`). */
export function DefectEditor({
  itemId,
  photos,
  defectType,
  defect,
  notice,
  onSaved,
  onDuplicate,
  onCancel,
}: {
  itemId: string;
  photos: Evidence[];
  defectType?: PickedDefectType;
  defect?: DefectView;
  notice?: string;
  onSaved: () => void;
  /** The core refused a new Defect because the Item already has this Defect Type. */
  onDuplicate?: (existingDefectId: string) => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [note, setNote] = useState(defect?.note ?? "");
  const [linked, setLinked] = useState<string[]>(defect?.evidenceIds ?? []);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = defect?.defectTypeName ?? defectType?.name;
  const code = defect?.defectTypeCode ?? defectType?.code;

  function toggle(evidenceId: string) {
    setLinked((current) =>
      current.includes(evidenceId) ? current.filter((id) => id !== evidenceId) : [...current, evidenceId],
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (defect) {
      const result = await homeCheck.editDefect(defect.id, { note, evidenceIds: linked });
      if (result.ok) onSaved();
      else setError(refusalMessage[result.reason]);
      return;
    }
    if (!defectType) return;
    const result = await homeCheck.addDefect(itemId, { defectTypeCode: defectType.code, note, evidenceIds: linked });
    if (result.ok) onSaved();
    else if (result.reason === "defect-type-already-recorded" && onDuplicate) onDuplicate(result.existingDefectId);
    else setError(refusalMessage[result.reason]);
  }

  async function remove() {
    if (!defect) return;
    const result = await homeCheck.removeDefect(defect.id);
    if (result.ok) onSaved();
    else setError(refusalMessage[result.reason]);
  }

  return (
    <section className="panel">
      <div className="card-row">
        <h2>{title}</h2>
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="muted defect-meta">
        {code}
        {defect && ` · ${defect.categoryName}`}
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <form className="form" onSubmit={save} noValidate>
        <label>
          {(defect ?? defectType)?.noteRequired ? "Note (required: describe what you see)" : "Note (optional)"}
          <textarea
            className="note-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. three scratches, lower left"
          />
        </label>

        <div>
          <h3>Linked photos</h3>
          {photos.length === 0 ? (
            <p className="muted">No photos of this Item yet.</p>
          ) : (
            <ul className="thumbnails">
              {photos.map((photo) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    className="thumbnail selectable"
                    aria-pressed={linked.includes(photo.id)}
                    aria-label={linked.includes(photo.id) ? "Unlink photo" : "Link photo"}
                    onClick={() => toggle(photo.id)}
                  >
                    <PhotoImage evidenceId={photo.id} version="thumbnail" alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary">
          {defect ? "Save Defect" : "Add Defect"}
        </button>
      </form>

      {defect &&
        (confirmingRemove ? (
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => setConfirmingRemove(false)}>
              Keep
            </button>
            <button type="button" className="link danger" onClick={remove}>
              Remove Defect
            </button>
          </div>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmingRemove(true)}>
            Remove Defect
          </button>
        ))}
    </section>
  );
}
