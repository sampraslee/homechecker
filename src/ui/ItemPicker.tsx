import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { CatalogItem, ItemChoices, ItemSource } from "../core";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

/**
 * Step 1 of Record a Defect on a new Item: which Item in the Area. Choosing one doesn't create it yet; the flow does
 * that when the first Evidence is saved. `name` is how the Item will read, e.g. "Wardrobe – Left".
 */
export function ItemPicker({
  areaId,
  areaName,
  initialShortName = "",
  onPicked,
}: {
  areaId: string;
  areaName: string;
  /** What was typed before going back to this step. */
  initialShortName?: string;
  onPicked: (source: ItemSource, name: string) => void;
}) {
  const homeCheck = useHomeCheck();
  const [choices, setChoices] = useState<ItemChoices | null>(null);
  const [shortName, setShortName] = useState(initialShortName);
  const [otherName, setOtherName] = useState("");
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
    const short = shortName.trim();
    onPicked({ catalogItemId: item.id, shortName: short }, short ? `${item.name} – ${short}` : item.name);
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
        <button key={item.id} type="button" className="chip" onClick={() => pickCatalogItem(item)}>
          {item.name}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <label className="form">
        Short name (optional), e.g. "left"
        <input value={shortName} onChange={(event) => setShortName(event.target.value)} />
      </label>
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
