import { useEffect, useState, type FormEvent } from "react";
import {
  MALAYSIAN_STATES,
  type AddressErrors,
  type AddressField,
  type HomeCheck,
  type InspectionSummary,
  type InspectionType,
  type UnitAddressInput,
} from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
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
  { field: "locality", label: "Area / Taman (optional)" },
  { field: "postcode", label: "Postcode", inputMode: "numeric" },
  { field: "city", label: "City" },
];

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
      navigate({ name: "inspection", id: result.inspection.id });
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

  return (
    <main className="screen">
      <BackBar navigate={navigate} />
      <h1>Start {inspectionTypeLabel[type]} Inspection</h1>

      {hasName === false && (
        <section className="prompt">
          <p>Set your name first. Every Inspection is stamped with who carried it out.</p>
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
          {refusal && <p className="error">{refusal}</p>}

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
                      <span className="card-row">
                        <strong>{formatDate(moveIn.startedAt)}</strong>
                        <span className={`badge ${moveIn.status}`}>{inspectionStatusLabel[moveIn.status]}</span>
                      </span>
                      <span>{moveIn.addressLine}</span>
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
    </main>
  );
}

/** The Unit's address in Malaysian fields. `onSubmit` returns the errors to show. */
function AddressForm({ onSubmit }: { onSubmit: (address: UnitAddressInput) => Promise<AddressErrors> }) {
  const [address, setAddress] = useState(emptyAddress);
  const [errors, setErrors] = useState<AddressErrors>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors(await onSubmit(address));
  }

  const update = (field: AddressField) => (value: string) => setAddress((current) => ({ ...current, [field]: value }));

  return (
    <form className="form" onSubmit={submit} noValidate>
      {textFields.map(({ field, label, inputMode }) => (
        <label key={field}>
          {label}
          <input
            value={address[field] ?? ""}
            onChange={(event) => update(field)(event.target.value)}
            inputMode={inputMode}
            maxLength={field === "postcode" ? 5 : undefined}
            aria-invalid={Boolean(errors[field])}
          />
          {errors[field] && <span className="error">{errors[field]}</span>}
        </label>
      ))}
      <label>
        State
        <select value={address.state} onChange={(event) => update("state")(event.target.value)} aria-invalid={Boolean(errors.state)}>
          <option value="">Choose…</option>
          {MALAYSIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        {errors.state && <span className="error">{errors.state}</span>}
      </label>
      <button type="submit" className="primary">
        Start Inspection
      </button>
    </form>
  );
}
