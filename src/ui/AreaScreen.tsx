import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Area, CatalogItem, Evidence, Inspection, ItemChoices, ItemSource, ItemView } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { countEvidence, inspectionTypeLabel, lockedNotice, refusalMessage, shortAddress } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { scrollIntoViewGently } from "./scroll";
import { NameEditor } from "./NameEditor";
import { useLocked } from "./useLocked";

/** An Item with what has been recorded on it, e.g. "4 photos, 1 Defect". */
type ItemRow = ItemView & { summary: string };

export function AreaScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [area, setArea] = useState<Area | null | undefined>(undefined);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useLocked(area?.inspectionId);
  // Editing controls wait until the lock is known, so they never flash up on a Completed Inspection.
  const editable = locked === false;

  const load = useCallback(async () => {
    const found = await homeCheck.getArea(id);
    setArea(found ?? null);
    if (found) setInspection((await homeCheck.getInspection(found.inspectionId)) ?? null);
    const views = await homeCheck.listItems(id);
    setItems(
      await Promise.all(
        views.map(async (item) => ({ ...item, summary: itemSummary(await homeCheck.listEvidence(item.id), item.defectCount) })),
      ),
    );
  }, [homeCheck, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (area === undefined) return null;
  if (area === null) {
    return (
      <main className="screen">
        <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title="Area not found" />
        <p className="muted">This Area is not on this phone.</p>
        <Dock />
      </main>
    );
  }

  const backToInspection = { name: "inspection", id: area.inspectionId } as const;

  async function removeArea() {
    const result = await homeCheck.removeArea(id);
    if (result.ok) navigate(backToInspection);
    else setError(refusalMessage[result.reason]);
  }

  async function removeItem(itemId: string) {
    const result = await homeCheck.removeItem(itemId);
    if (result.ok) {
      setError(null);
      load();
    } else {
      setError(refusalMessage[result.reason]);
    }
  }

  function stopEditing() {
    setEditing(false);
    setRenaming(false);
    setEditingItemId(null);
    setError(null);
  }

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={{ to: backToInspection, label: inspection ? inspectionTypeLabel[inspection.type] : "Inspection" }}
        unit={inspection ? shortAddress(inspection.address) : undefined}
        title={area.name}
        action={
          editable && (
            <button
              type="button"
              className="on-band"
              onClick={() => {
                if (editing) stopEditing();
                else {
                  setPicking(false);
                  setEditing(true);
                }
              }}
            >
              {editing ? "Done" : "Edit"}
            </button>
          )
        }
      >
        {editing && !renaming && (
          <div className="band-actions">
            <button type="button" className="on-band" onClick={() => setRenaming(true)}>
              Rename Area
            </button>
            <button type="button" className="on-band danger" onClick={removeArea}>
              Remove Area
            </button>
          </div>
        )}
        {locked && <p className="notice">{lockedNotice}</p>}
      </Band>

      {renaming && (
        <NameEditor
          label="Area name"
          initialName={area.name}
          onCancel={() => setRenaming(false)}
          onSave={async (name) => {
            const result = await homeCheck.renameArea(id, name);
            if (!result.ok) return refusalMessage[result.reason];
            setRenaming(false);
            load();
            return null;
          }}
        />
      )}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="section-head">
        <h2>Items</h2>
        <span className="count">{items.length > 0 && items.length}</span>
      </div>
      {items.length === 0 && (
        <p className="muted">{editable ? `Add the things in the ${area.name} you'll check, such as walls, fittings and furniture.` : "No Items."}</p>
      )}
      <ul className="cards">
        {items.map((item) => (
          <li key={item.id}>
            {editingItemId === item.id ? (
              <div className="card">
                <NameEditor
                  label={item.catalogItemId ? `Short name for ${item.name} (optional)` : "Item name"}
                  initialName={item.catalogItemId ? (item.shortName ?? "") : item.name}
                  onCancel={() => setEditingItemId(null)}
                  onSave={async (name) => {
                    const result = await homeCheck.renameItem(item.id, name);
                    if (!result.ok) return refusalMessage[result.reason];
                    setEditingItemId(null);
                    load();
                    return null;
                  }}
                />
              </div>
            ) : editing ? (
              <div className="card item-card">
                <span className="grow">
                  <strong>{item.displayName}</strong>
                  <span className="summary">{item.summary}</span>
                </span>
                <button type="button" className="row-action" onClick={() => setEditingItemId(item.id)}>
                  Rename
                </button>
                <button type="button" className="row-action danger" onClick={() => removeItem(item.id)}>
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" className="card item-card" onClick={() => navigate({ name: "item", id: item.id })}>
                <span className="grow">
                  <strong>{item.displayName}</strong>
                  <span className="summary">{item.summary}</span>
                </span>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {editable && picking && (
        <ItemPicker
          areaId={id}
          areaName={area.name}
          onAdded={() => {
            setPicking(false);
            load();
          }}
          onCancel={() => setPicking(false)}
        />
      )}

      <Dock
        action={
          editable &&
          !editing &&
          !picking && (
            <button type="button" className="primary" onClick={() => setPicking(true)}>
              Add Item
            </button>
          )
        }
      />
    </main>
  );
}

/** "4 photos, 1 Defect", or "Nothing recorded yet". */
function itemSummary(evidence: Evidence[], defectCount: number): string {
  const defects = defectCount === 0 ? "" : defectCount === 1 ? "1 Defect" : `${defectCount} Defects`;
  return [countEvidence(evidence), defects].filter(Boolean).join(", ") || "Nothing recorded yet";
}

function ItemPicker({
  areaId,
  areaName,
  onAdded,
  onCancel,
}: {
  areaId: string;
  areaName: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [choices, setChoices] = useState<ItemChoices | null>(null);
  const [shortName, setShortName] = useState("");
  const [otherName, setOtherName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);

  // The picker opens below the Area's Items, often off screen.
  useEffect(() => {
    scrollIntoViewGently(panel.current);
  }, []);

  useEffect(() => {
    homeCheck.itemChoices(areaId).then((result) => {
      if (result.ok) setChoices(result);
    });
  }, [homeCheck, areaId]);

  async function add(source: ItemSource) {
    const result = await homeCheck.addItem(areaId, source);
    if (result.ok) onAdded();
    else setError(refusalMessage[result.reason]);
  }

  function addOther(event: FormEvent) {
    event.preventDefault();
    add({ otherName });
  }

  const chips = (items: CatalogItem[]) => (
    <div className="chips">
      {items.map((item) => (
        <button key={item.id} type="button" className="chip" onClick={() => add({ catalogItemId: item.id, shortName })}>
          {item.name}
        </button>
      ))}
    </div>
  );

  return (
    <section className="panel" ref={panel}>
      <div className="card-row">
        <h2>Add Item</h2>
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <label className="form">
        Short name (optional), e.g. "left"
        <input value={shortName} onChange={(event) => setShortName(event.target.value)} />
      </label>
      {choices && choices.shownFirst.length > 0 && (
        <>
          <h3>Usual in {areaName}</h3>
          {chips(choices.shownFirst)}
        </>
      )}
      {choices && (
        <>
          <h3>{choices.shownFirst.length > 0 ? "All other Items" : "All Items"}</h3>
          {chips(choices.others)}
        </>
      )}
      <form className="form" onSubmit={addOther} noValidate>
        <label>
          Item not in the list
          <input value={otherName} onChange={(event) => setOtherName(event.target.value)} />
          {error && <span className="error" role="alert">{error}</span>}
        </label>
        <button type="submit" className="secondary">
          Add this Item
        </button>
      </form>
    </section>
  );
}
