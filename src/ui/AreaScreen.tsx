import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Area, CatalogItem, ItemChoices, ItemSource, ItemView } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { lockedNotice, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { NameEditor } from "./NameEditor";
import { useLocked } from "./useLocked";

export function AreaScreen({ id, navigate }: { id: string; navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [area, setArea] = useState<Area | null | undefined>(undefined);
  const [items, setItems] = useState<ItemView[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useLocked(area?.inspectionId);
  // Editing controls wait until the lock is known, so they never flash up on a Completed Inspection.
  const editable = locked === false;

  const load = useCallback(async () => {
    setArea((await homeCheck.getArea(id)) ?? null);
    setItems(await homeCheck.listItems(id));
  }, [homeCheck, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (area === undefined) return null;
  if (area === null) {
    return (
      <main className="screen">
        <BackBar navigate={navigate} />
        <p className="muted">This Area is not on this phone.</p>
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

  return (
    <main className="screen">
      <BackBar navigate={navigate} to={backToInspection} label="Inspection" />

      {renaming ? (
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
      ) : (
        <div className="card-row">
          <h1>{area.name}</h1>
          {editable && (
            <span className="button-row">
              <button type="button" className="link" onClick={() => setRenaming(true)}>
                Rename
              </button>
              <button type="button" className="link danger" onClick={removeArea}>
                Remove
              </button>
            </span>
          )}
        </div>
      )}
      {locked && <p className="notice">{lockedNotice}</p>}
      {error && <p className="error">{error}</p>}

      <h2>Items</h2>
      {items.length === 0 && <p className="muted">No Items yet.</p>}
      <ul className="rows">
        {items.map((item) =>
          editingItemId === item.id ? (
            <li key={item.id}>
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
            </li>
          ) : (
            <li key={item.id} className="row">
              <button type="button" className="link item-link" onClick={() => navigate({ name: "item", id: item.id })}>
                {item.displayName} ›
                {item.defectCount > 0 && (
                  <span className="badge defects">
                    {item.defectCount} {item.defectCount === 1 ? "Defect" : "Defects"}
                  </span>
                )}
              </button>
              {editable && (
                <span className="button-row">
                  <button type="button" className="link" onClick={() => setEditingItemId(item.id)}>
                    Rename
                  </button>
                  <button type="button" className="link danger" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </span>
              )}
            </li>
          ),
        )}
      </ul>

      {!editable ? null : picking ? (
        <ItemPicker
          areaId={id}
          areaName={area.name}
          onAdded={() => {
            setPicking(false);
            load();
          }}
          onCancel={() => setPicking(false)}
        />
      ) : (
        <button type="button" className="primary spaced" onClick={() => setPicking(true)}>
          Add Item
        </button>
      )}
    </main>
  );
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
    <section className="panel">
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
          Other item (not in the list)
          <input value={otherName} onChange={(event) => setOtherName(event.target.value)} />
          {error && <span className="error">{error}</span>}
        </label>
        <button type="submit" className="secondary">
          Add other item
        </button>
      </form>
    </section>
  );
}
