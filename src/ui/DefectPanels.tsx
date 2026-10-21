import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronRight, Search } from "lucide-react";
import { isMedia, isNote, SEVERITIES, type DefectCategory, type DefectChoices, type DefectType, type DefectView, type Evidence, type Severity } from "../core";
import { refusalMessage } from "./format";
import { useBackCloses } from "./backCloses";
import { useHomeCheck } from "./homeCheckContext";
import { MediaThumbnail } from "./MediaImage";

/** How long the sheet takes to slide down; matches the CSS. */
const SHEET_OUT_MS = 200;

export type PickedDefectType = DefectType & { noteRequired: boolean };

/** Minor, Moderate or Major for one Defect; nothing is preselected (ADR 0007). */
export function SeverityPicker({ value, onChange }: { value: Severity | undefined; onChange: (severity: Severity) => void }) {
  return (
    <div role="group" aria-label="Severity" className="segmented severity-picker">
      {SEVERITIES.map((each) => (
        <button key={each} type="button" aria-pressed={value === each} onClick={() => onChange(each)}>
          {each}
        </button>
      ))}
    </div>
  );
}

/**
 * Defect Category, then Defect Type, in a bottom sheet over the screen (UX-025). The Item's relevant Categories come
 * first. The sheet names what the Defect Type is for, and the Dock waits behind it (UX-022).
 */
export function DefectTypePicker({
  itemId,
  itemName,
  title = "Add Defect",
  subject,
  recordedCodes,
  onPicked,
  onCancel,
}: {
  itemId: string;
  itemName: string;
  title?: string;
  /** What the Defect Type is for, such as the Evidence being assigned, shown under the title. */
  subject?: ReactNode;
  /** Defect Types this Item already has, marked so the Inspector can see them. */
  recordedCodes: string[];
  onPicked: (defectType: PickedDefectType) => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  /** Sliding down before closing: the parent unmounts the sheet once `onCancel` or `onPicked` runs. */
  const [leaving, setLeaving] = useState(false);
  function leave(then: () => void) {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return then();
    setLeaving(true);
    setTimeout(then, SHEET_OUT_MS);
  }
  const close = () => leave(onCancel);
  useBackCloses(close);
  const [choices, setChoices] = useState<DefectChoices | null>(null);
  const [category, setCategory] = useState<DefectCategory | null>(null);
  /** Searches every Defect Type by name, across Categories, instead of scanning the long Category list (UX-006). */
  const [query, setQuery] = useState("");
  const sheet = useRef<HTMLElement>(null);
  const headingId = useId();

  // Each step starts at the top of the sheet's own list.
  useEffect(() => {
    sheet.current?.scrollTo({ top: 0 });
  }, [category]);

  // Focus moves into the sheet and back to the tapped button on close; Escape closes it.
  const cancel = useRef(close);
  cancel.current = close;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    sheet.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    homeCheck.defectChoices(itemId).then((result) => {
      if (result.ok) setChoices(result);
    });
  }, [homeCheck, itemId]);

  const wanted = query.trim().toLowerCase();
  /** While searching: the matching Defect Types with their Category, relevant Categories first; `null` when empty. */
  const searched =
    !choices || !wanted
      ? null
      : [...choices.shownFirst, ...choices.others].flatMap((each) =>
          each.defectTypes.filter((defectType) => defectType.name.toLowerCase().includes(wanted)).map((defectType) => ({ category: each, defectType })),
        );

  /** One light list row: a chevron to pick it, or a calm teal "Recorded" once the Item has it (UX-027). */
  const typeRow = (defectType: DefectType, of: DefectCategory, showCategory: boolean) => (
    <li key={defectType.code}>
      <button type="button" className="type-row" onClick={() => leave(() => onPicked({ ...defectType, noteRequired: !!of.noteRequired }))}>
        <span className="type-row-name">
          {defectType.name}
          {showCategory && <span className="muted type-row-category">{of.name}</span>}
        </span>
        {recordedCodes.includes(defectType.code) ? (
          <span className="recorded-mark">
            <Check className="status-icon" aria-hidden="true" />
            Recorded
          </span>
        ) : (
          <ChevronRight className="chevron" aria-hidden="true" />
        )}
      </button>
    </li>
  );

  /** The usual Categories are enough most of the time, so the rest wait behind "More Categories" (UX-026). */
  const [showAllCategories, setShowAllCategories] = useState(false);

  const chips = (categories: DefectCategory[], usual = false) => (
    <div className="chips">
      {categories.map((option) => (
        <button key={option.code} type="button" className={usual ? "chip usual-chip" : "chip"} onClick={() => setCategory(option)}>
          {option.name}
        </button>
      ))}
    </div>
  );

  return (
    // Tapping outside the sheet cancels, as Cancel does.
    <div className={leaving ? "sheet-backdrop leaving" : "sheet-backdrop"} onClick={close}>
      <section
        className="panel sheet"
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
      <div className="sheet-head">
        <div className="card-row">
          <h2 id={headingId}>{category ? category.name : title}</h2>
          <button type="button" className="link" onClick={category ? () => setCategory(null) : close}>
            {category ? "‹ Categories" : "Cancel"}
          </button>
        </div>
        {subject && <div className="sheet-subject">{subject}</div>}
      </div>

      {category ? (
        <ul className="type-list">{category.defectTypes.map((defectType) => typeRow(defectType, category, false))}</ul>
      ) : (
        choices && (
          <>
            <label className="form search-field">
              Find a Defect Type
              <span className="search-input">
                <Search aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. crack" />
              </span>
            </label>
          </>
        )
      )}
      {!category && searched !== null && (
        <>
          <h3>{searched.length === 0 ? "No Defect Type matches" : "Matching Defect Types"}</h3>
          {searched.length === 0 ? (
            <p className="muted">Try another word, or pick a Category below.</p>
          ) : (
            <ul className="type-list">{searched.map(({ category: of, defectType }) => typeRow(defectType, of, true))}</ul>
          )}
        </>
      )}
      {!category && (
        choices && (
          <>
            {choices.shownFirst.length > 0 && (
              <>
                <h3>Usual for {itemName}</h3>
                {chips(choices.shownFirst, true)}
              </>
            )}
            {choices.shownFirst.length > 0 && !showAllCategories ? (
              <button type="button" className="secondary more-categories" onClick={() => setShowAllCategories(true)}>
                More Categories ({choices.others.length})
              </button>
            ) : (
              <>
                <h3>{choices.shownFirst.length > 0 ? "All other Categories" : "All Categories"}</h3>
                {chips(choices.others)}
              </>
            )}
          </>
        )
      )}
      </section>
    </div>
  );
}

/** Note and linked Evidence for a new Defect (`defectType`) or an existing one (`defect`). */
export function DefectEditor({
  itemId,
  evidence,
  defectType,
  defect,
  initialLinked,
  notice,
  onSaved,
  onDuplicate,
  onCancel,
}: {
  itemId: string;
  /** All of the Item's Evidence, any of which can be linked. */
  evidence: Evidence[];
  defectType?: PickedDefectType;
  defect?: DefectView;
  /** The Evidence a new Defect starts with: the piece it is being assigned to. */
  initialLinked?: string[];
  notice?: string;
  onSaved: () => void;
  /** The core refused a new Defect because the Item already has this Defect Type. */
  onDuplicate?: (existingDefectId: string) => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  useBackCloses(onCancel);
  const [note, setNote] = useState(defect?.note ?? "");
  const [linked, setLinked] = useState<string[]>(defect?.evidenceIds ?? initialLinked ?? []);
  const [severity, setSeverity] = useState<Severity | undefined>(defect?.severity);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = defect?.defectTypeName ?? defectType?.name;

  function toggle(evidenceId: string) {
    setLinked((current) =>
      current.includes(evidenceId) ? current.filter((id) => id !== evidenceId) : [...current, evidenceId],
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (defect) {
      const result = await homeCheck.editDefect(defect.id, { note, evidenceIds: linked, severity });
      if (result.ok) onSaved();
      else setError(refusalMessage[result.reason]);
      return;
    }
    if (!defectType) return;
    const result = await homeCheck.addDefect(itemId, { defectTypeCode: defectType.code, note, evidenceIds: linked, severity });
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
      {defect && <p className="muted defect-meta">{defect.categoryName}</p>}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <form className="form" onSubmit={save} noValidate>
        <label>
          {(defect ?? defectType)?.noteRequired ? "Note (required): describe what you see" : "Note (optional)"}
          <textarea
            className="note-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. three scratches, lower left"
          />
        </label>

        <div>
          <h3>Severity</h3>
          <SeverityPicker value={severity} onChange={setSeverity} />
        </div>

        <div>
          <h3>Linked Evidence</h3>
          {evidence.length === 0 ? (
            <p className="muted">No Evidence of this Item yet.</p>
          ) : (
            <>
              <ul className="thumbnails">
                {evidence.filter(isMedia).map((media) => (
                  <li key={media.id}>
                    <button
                      type="button"
                      className={`thumbnail selectable ${media.kind}`}
                      aria-pressed={linked.includes(media.id)}
                      aria-label={`${linked.includes(media.id) ? "Unlink" : "Link"} ${media.kind}`}
                      onClick={() => toggle(media.id)}
                    >
                      <MediaThumbnail evidence={media} />
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="cards">
                {evidence.filter(isNote).map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      className="card note-card selectable"
                      aria-pressed={linked.includes(note.id)}
                      aria-label={`${linked.includes(note.id) ? "Unlink" : "Link"} note: ${note.text}`}
                      onClick={() => toggle(note.id)}
                    >
                      {note.text}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="primary">
          {defect ? "Save Defect" : "Add Defect"}
        </button>
      </form>

      {defect &&
        (confirmingRemove ? (
          <>
            <p>Remove this Defect? Its linked Evidence stays on the Item.</p>
            <div className="button-row">
              <button type="button" className="secondary" onClick={() => setConfirmingRemove(false)}>
                Keep Defect
              </button>
              <button type="button" className="link danger" onClick={remove}>
                Remove Defect
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="link danger" onClick={() => setConfirmingRemove(true)}>
            Remove Defect
          </button>
        ))}
    </section>
  );
}
