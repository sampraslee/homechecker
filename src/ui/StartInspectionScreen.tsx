import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import {
  formatAddress,
  MALAYSIAN_STATES,
  SUGGESTING_ADDRESS_FIELDS,
  type AddressErrors,
  type AddressField,
  type HomeCheck,
  type InspectionSummary,
  type InspectionType,
  type UnitAddress,
  type UnitAddressInput,
} from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { formatDate, inspectionStatusLabel, inspectionTypeLabel, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { InspectorNameForm } from "./InspectorNameForm";

const emptyAddress: UnitAddressInput = {
  unitNumber: "",
  buildingName: "",
  street: "",
  locality: "",
  postcode: "",
  city: "",
  state: "",
};

const textFields: { field: Exclude<AddressField, "state">; label: string; inputMode?: "numeric" }[] = [
  { field: "unitNumber", label: "Unit number" },
  { field: "buildingName", label: "Building name (optional)" },
  { field: "street", label: "Street" },
  { field: "locality", label: "Taman / neighbourhood (optional)" },
  { field: "postcode", label: "Postcode", inputMode: "numeric" },
  { field: "city", label: "City" },
];

/** Lets the Dock's button, outside the form, submit it. */
const ADDRESS_FORM_ID = "address-form";

/** Enough to pick from on a phone screen without pushing the rest of the form away. */
const MAX_SHOWN_SUGGESTIONS = 4;

type StartResult = Awaited<ReturnType<HomeCheck["startMoveIn"]> | ReturnType<HomeCheck["startMoveOut"]>>;

export function StartInspectionScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [hasName, setHasName] = useState<boolean | null>(null);
  const [type, setType] = useState<InspectionType>("move-in");
  const [moveIns, setMoveIns] = useState<InspectionSummary[] | null>(null);
  /** A Move-out for a Unit whose Move-in isn't on this phone. */
  const [typingMoveOutAddress, setTypingMoveOutAddress] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    homeCheck.getSettings().then((settings) => setHasName(settings.inspectorName !== null));
    homeCheck.listMoveIns().then(setMoveIns);
  }, [homeCheck]);

  /** Opens the new Inspection, or explains the refusal; returns the address errors, if that's why it was refused. */
  function openOrExplain(result: StartResult): AddressErrors {
    if (result.ok) {
      // Back from the new Inspection goes to the list, not to this form.
      navigate({ name: "inspection", id: result.inspection.id }, { replace: true });
    } else if (result.reason === "invalid-address") {
      return result.errors;
    } else if (result.reason === "inspector-name-required") {
      setHasName(false);
    } else {
      setRefusal(refusalMessage[result.reason]);
    }
    return {};
  }

  const pickingMoveIn = type === "move-out" && !typingMoveOutAddress && moveIns !== null && moveIns.length > 0;
  const typingAddress = hasName === true && (type === "move-in" || (!pickingMoveIn && moveIns !== null));

  return (
    <main className="screen">
      <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title={`Start ${inspectionTypeLabel[type]}`} />

      {hasName === false && (
        <section className="prompt">
          <p>Enter your name first. Each Inspection records who carried it out.</p>
          <InspectorNameForm onSaved={() => setHasName(true)} />
        </section>
      )}

      {hasName && (
        <>
          <div className="segmented" role="group" aria-label="Inspection type">
            {(["move-in", "move-out"] as const).map((each) => (
              <button
                key={each}
                type="button"
                aria-pressed={type === each}
                onClick={() => {
                  setType(each);
                  setRefusal(null);
                }}
              >
                {inspectionTypeLabel[each]}
              </button>
            ))}
          </div>
          {refusal && <p className="error" role="alert">{refusal}</p>}

          {type === "move-in" && (
            <AddressForm key="move-in" onSubmit={async (address) => openOrExplain(await homeCheck.startMoveIn(address))} />
          )}

          {pickingMoveIn && (
            <>
              <p className="muted">Pick the Move-in of this tenancy. Its Areas and Items are copied; its Defects and Evidence are not.</p>
              <ul className="cards">
                {moveIns.map((moveIn) => (
                  <li key={moveIn.id}>
                    <button
                      type="button"
                      className="card"
                      onClick={async () => openOrExplain(await homeCheck.startMoveOut({ moveInId: moveIn.id }))}
                    >
                      <strong>{moveIn.addressLine}</strong>
                      <span className="card-row">
                        <span className="muted">{formatDate(moveIn.startedAt)}</span>
                        <span className={`badge ${moveIn.status}`}>{inspectionStatusLabel[moveIn.status]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="link spaced" onClick={() => setTypingMoveOutAddress(true)}>
                Move-in not on this phone? Type the address
              </button>
            </>
          )}

          {type === "move-out" && !pickingMoveIn && moveIns !== null && (
            <>
              <p className="muted">
                {moveIns.length === 0 ? "There's no Move-in on this phone, so" : "Without a Move-in,"} this Move-out won't
                be linked and starts with no Areas.
              </p>
              <AddressForm key="move-out" onSubmit={async (address) => openOrExplain(await homeCheck.startMoveOut({ address }))} />
            </>
          )}
        </>
      )}

      <Dock
        action={
          typingAddress && (
            <button type="submit" form={ADDRESS_FORM_ID} className="primary">
              Start {inspectionTypeLabel[type]}
            </button>
          )
        }
      />
    </main>
  );
}

/** The Unit's address in Malaysian fields, with earlier addresses on this phone suggested as it's typed. `onSubmit` returns the errors to show. */
function AddressForm({ onSubmit }: { onSubmit: (address: UnitAddressInput) => Promise<AddressErrors> }) {
  const homeCheck = useHomeCheck();
  const [address, setAddress] = useState(emptyAddress);
  const [errors, setErrors] = useState<AddressErrors>({});
  /** The field being typed in, and the earlier addresses matching it. */
  const [suggesting, setSuggesting] = useState<{ field: AddressField; suggestions: UnitAddress[] } | null>(null);
  /** Counts lookups, so a slower one for an earlier keystroke can't replace a newer one's. */
  const latestLookup = useRef(0);
  const form = useRef<HTMLFormElement>(null);

  // After a refused start, take the Inspector to the first field to fix (WCAG 3.3.1).
  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors(await onSubmit(address));
  }

  function setField(field: AddressField, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  /** Sets the field, and looks up earlier addresses matching it. */
  function typeInto(field: AddressField, value: string) {
    setField(field, value);
    const lookup = ++latestLookup.current;
    if (!(SUGGESTING_ADDRESS_FIELDS as readonly AddressField[]).includes(field)) {
      setSuggesting(null);
      return;
    }
    homeCheck
      .suggestAddresses(value)
      // Suggestions only help; if they can't be looked up, the Inspector types the address in full.
      .catch(() => [])
      .then((suggestions) => {
        if (lookup === latestLookup.current) setSuggesting({ field, suggestions });
      });
  }

  function pick(suggestion: UnitAddress) {
    latestLookup.current++;
    setAddress({ ...emptyAddress, ...suggestion });
    setErrors({});
    setSuggesting(null);
  }

  return (
    <form id={ADDRESS_FORM_ID} ref={form} className="form spaced" onSubmit={submit} noValidate>
      {textFields.map(({ field, label, inputMode }) => (
        <Fragment key={field}>
          <label>
            {label}
            <input
              value={address[field] ?? ""}
              onChange={(event) => typeInto(field, event.target.value)}
              inputMode={inputMode}
              maxLength={field === "postcode" ? 5 : undefined}
              aria-invalid={Boolean(errors[field])}
            />
            {errors[field] && <span className="error">{errors[field]}</span>}
          </label>
          {suggesting?.field === field && suggesting.suggestions.length > 0 && (
            <ul className="suggestions" aria-label="Addresses entered before on this phone">
              {suggesting.suggestions.slice(0, MAX_SHOWN_SUGGESTIONS).map((suggestion) => (
                <li key={formatAddress(suggestion)}>
                  <button type="button" onClick={() => pick(suggestion)}>
                    {formatAddress(suggestion)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Fragment>
      ))}
      <label>
        State
        <select value={address.state} onChange={(event) => setField("state", event.target.value)} aria-invalid={Boolean(errors.state)}>
          <option value="">Choose a state</option>
          {MALAYSIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        {errors.state && <span className="error">{errors.state}</span>}
      </label>
    </form>
  );
}
