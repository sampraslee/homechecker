import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { CatalogItem, ItemChoices, ItemSource } from "../core";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

/**
 * Step 1 of Record a Defect on a new Item: which Item in the Area. Tapping one only selects it; `Next` in the flow
 * confirms. Nothing is created until the first Evidence is saved. A new Item takes its catalog name.
 */
export function ItemPicker({
  areaId,
  areaName,
  selected,
  onPicked,
}: {
  areaId: string;
  areaName: string;
  /** The Item chosen so far, kept when going back to this step. */
  selected?: ItemSource | null;
  onPicked: (source: ItemSource, name: string) => void;
}) {
  const homeCheck = useHomeCheck();
  const [choices, setChoices] = useState<ItemChoices | null>(null);
  const [otherName, setOtherName] = useState(selected && "otherName" in selected ? selected.otherName : "");
  /** Narrows the long Item list to names containing what's typed (UX-006). */
  const [query, setQuery] = useState("");
  /** "All other Items" is a long list, so it stays closed until the Inspector opens it (when there is a usual list above it). */
  const [showOthers, setShowOthers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    homeCheck.itemChoices(areaId).then((result) => {
      if (result.ok) setChoices(result);
    });
  }, [homeCheck, areaId]);

  function pickCatalogItem(item: CatalogItem) {
    setError(null);
    onPicked({ catalogItemId: item.id }, item.name);
  }

  function pickOther(event: FormEvent) {
    event.preventDefault();
    const name = otherName.trim();
    if (!name) return setError(refusalMessage["item-name-required"]);
    onPicked({ otherName: name }, name);
  }

  /** While searching: the matches from both lists, usual ones first; `null` when the search is empty. */
  const wanted = query.trim().toLowerCase();
  const searched = !choices || !wanted
    ? null
    : [...choices.shownFirst, ...choices.others].filter((item) => item.name.toLowerCase().includes(wanted));

  const chips = (items: CatalogItem[]) => (
    <div className="chips">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="chip"
          aria-pressed={Boolean(selected && "catalogItemId" in selected && selected.catalogItemId === item.id)}
          onClick={() => pickCatalogItem(item)}>
          {item.name}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <label className="form search-field">
        Find an Item
        <span className="search-input">
          <Search aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. window" />
        </span>
      </label>
      {choices && searched !== null && (
        <>
          <h3>{searched.length === 0 ? "No Item matches" : "Matching Items"}</h3>
          {searched.length === 0 ? <p className="muted">Add it below as an Item not in the list.</p> : chips(searched)}
        </>
      )}
      {choices && searched === null && choices.shownFirst.length > 0 && (
        <>
          <h3>Usual in {areaName}</h3>
          {chips(choices.shownFirst)}
        </>
      )}
      {choices && searched === null && choices.shownFirst.length > 0 && (
        <>
          <button type="button" className="secondary" aria-expanded={showOthers} onClick={() => setShowOthers(!showOthers)}>
            All other Items ({choices.others.length})
          </button>
          {showOthers && chips(choices.others)}
        </>
      )}
      {choices && searched === null && choices.shownFirst.length === 0 && (
        <>
          <h3>All Items</h3>
          {chips(choices.others)}
        </>
      )}
      <form className="form" onSubmit={pickOther} noValidate>
        <label>
          Item not in the list
          <input value={otherName} onChange={(event) => setOtherName(event.target.value)} />
          {error && <span className="error" role="alert">{error}</span>}
        </label>
        <button type="submit" className="secondary">
          Use this Item
        </button>
      </form>
    </>
  );
}
