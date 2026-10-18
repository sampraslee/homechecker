import { useEffect, useState, type FormEvent } from "react";
import { MALAYSIAN_STATES, type AddressErrors, type AddressField, type UnitAddressInput } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
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

export function StartInspectionScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [hasName, setHasName] = useState<boolean | null>(null);
  const [address, setAddress] = useState(emptyAddress);
  const [errors, setErrors] = useState<AddressErrors>({});

  useEffect(() => {
    homeCheck.getSettings().then((settings) => setHasName(settings.inspectorName !== null));
  }, [homeCheck]);

  async function start(event: FormEvent) {
    event.preventDefault();
    const result = await homeCheck.startMoveIn(address);
    if (result.ok) {
      navigate({ name: "inspection", id: result.inspection.id });
    } else if (result.reason === "inspector-name-required") {
      setHasName(false);
    } else {
      setErrors(result.errors);
    }
  }

  const update = (field: AddressField) => (value: string) => setAddress((current) => ({ ...current, [field]: value }));

  return (
    <main className="screen">
      <BackBar navigate={navigate} />
      <h1>Start Move-in Inspection</h1>

      {hasName === false && (
        <section className="prompt">
          <p>Set your name first. Every Inspection is stamped with who carried it out.</p>
          <InspectorNameForm onSaved={() => setHasName(true)} />
        </section>
      )}

      {hasName && (
        <form className="form" onSubmit={start} noValidate>
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
      )}
    </main>
  );
}
