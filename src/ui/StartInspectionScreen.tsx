import { Fragment, useEffect, useRef, useState, type Dispatch, type FormEvent, type KeyboardEvent, type SetStateAction } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import {
  formatAddress,
  MALAYSIAN_STATES,
  SUGGESTING_ADDRESS_FIELDS,
  validateAddress,
  type AddressErrors,
  type AddressField,
  type HomeCheck,
  type InspectionSummary,
  type InspectionType,
  type UnitAddress,
  type UnitAddressInput,
} from "../core";
import type { Navigate } from "./App";
import { BackCloses } from "./backCloses";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { formatDate, inspectionStatusLabel, inspectionTypeLabel, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { InspectorNameForm } from "./InspectorNameForm";
import { StepHeader } from "./StepHeader";

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
  /** The Move-in / Move-out choice is its own first screen, so nothing else shows until one is picked. */
  const [typeChosen, setTypeChosen] = useState(false);
  const [type, setType] = useState<InspectionType>("move-in");
  const [moveIns, setMoveIns] = useState<InspectionSummary[] | null>(null);
  /** A Move-out for a Unit whose Move-in isn't on this phone. */
  const [typingMoveOutAddress, setTypingMoveOutAddress] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  /** Kept here, not in the form, so going back to change Move-in or Move-out keeps what was typed. */
  const [address, setAddress] = useState(emptyAddress);

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

  function chooseType(each: InspectionType) {
    setType(each);
    setRefusal(null);
    setTypeChosen(true);
  }

  /** Up to the Move-in / Move-out screen, keeping any typed address. */
  function backToType() {
    setTypeChosen(false);
    setTypingMoveOutAddress(false);
    setRefusal(null);
  }

  /** Past the Move-in / Move-out screen, back goes to it, not to the list. */
  const insideStart = hasName === true && typeChosen;

  // The Move-in / Move-out choice, as its own screen before the address.
  if (hasName === true && !typeChosen) {
    return (
      <main className="screen">
        <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title="Start an Inspection" />
        {/* The screen asks one thing, so it says so (UX-035). */}
        <h2 className="type-question">What are you inspecting?</h2>
        <ul className="cards">
          {(["move-in", "move-out"] as const).map((each) => (
            <li key={each}>
              <button type="button" className="card item-card" onClick={() => chooseType(each)}>
                <span className="grow">
                  <strong>{inspectionTypeLabel[each]}</strong>
                  <span className="summary">{each === "move-in" ? "Before a tenant moves in" : "After a tenant moves out"}</span>
                </span>
                <ChevronRight className="chevron" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={insideStart ? { onBack: backToType, label: "Move-in or Move-out" } : { to: { name: "list" }, label: "Inspections" }}
        title={`Start ${inspectionTypeLabel[type]}`}
      />
      {/* The phone's back gesture does the same. */}
      {insideStart && <BackCloses onBack={backToType} />}

      {hasName === false && (
        <section className="prompt">
          <p>Enter your name first. Each Inspection records who carried it out.</p>
          <InspectorNameForm onSaved={() => setHasName(true)} />
        </section>
      )}

      {hasName && (
        <>
          {refusal && <p className="error" role="alert">{refusal}</p>}

          {type === "move-in" && (
            <AddressForm
              key="move-in"
              address={address}
              setAddress={setAddress}
              startLabel={`Start ${inspectionTypeLabel[type]}`}
              onSubmit={async (address) => openOrExplain(await homeCheck.startMoveIn(address))}
            />
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
              <AddressForm
                key="move-out"
                address={address}
                setAddress={setAddress}
                startLabel={`Start ${inspectionTypeLabel[type]}`}
                onSubmit={async (address) => openOrExplain(await homeCheck.startMoveOut({ address }))}
              />
            </>
          )}
        </>
      )}

      {/* The address form brings its own Dock, with Back and Next. */}
      {!typingAddress && <Dock />}
    </main>
  );
}

/** The address in three screens, one group of related fields each, then a review of the whole. */
const ADDRESS_GROUPS: { title: string; fields: AddressField[] }[] = [
  { title: "Which Unit?", fields: ["unitNumber", "buildingName"] },
  { title: "Where is it?", fields: ["street", "locality"] },
  { title: "Postal details", fields: ["postcode", "city", "state"] },
];

const addressLabel: Record<AddressField, string> = {
  unitNumber: "Unit number",
  buildingName: "Building or condo name",
  street: "Street",
  locality: "Taman or neighbourhood",
  postcode: "Postcode",
  city: "City",
  state: "State",
};

function errorsIn(errors: AddressErrors, fields: AddressField[]): AddressErrors {
  const picked: AddressErrors = {};
  for (const field of fields) if (errors[field]) picked[field] = errors[field];
  return picked;
}

/**
 * The Unit's address, asked a group of fields at a time, with earlier addresses on this phone suggested as it's typed. The
 * review checks the whole address and sends the Inspector back to the first group with an error. `onSubmit` returns the errors to show.
 */
function AddressForm({
  address,
  setAddress,
  startLabel,
  onSubmit,
}: {
  address: UnitAddressInput;
  setAddress: Dispatch<SetStateAction<UnitAddressInput>>;
  startLabel: string;
  onSubmit: (address: UnitAddressInput) => Promise<AddressErrors>;
}) {
  const homeCheck = useHomeCheck();
  const [errors, setErrors] = useState<AddressErrors>({});
  /** Which group is showing; the step after the last group is the review. */
  const [step, setStep] = useState(0);
  const reviewing = step === ADDRESS_GROUPS.length;
  /** The field being typed in, and the earlier addresses matching it. */
  const [suggesting, setSuggesting] = useState<{ field: AddressField; suggestions: UnitAddress[] } | null>(null);
  /** Counts lookups, so a slower one for an earlier keystroke can't replace a newer one's. */
  const latestLookup = useRef(0);
  const form = useRef<HTMLFormElement>(null);

  // After a refused step, take the Inspector to the first field to fix (WCAG 3.3.1).
  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  /** Moves on from the current group, or shows what needs fixing in it first. */
  function next() {
    const validation = validateAddress(address);
    const groupErrors = validation.ok ? {} : errorsIn(validation.errors, ADDRESS_GROUPS[step].fields);
    if (Object.keys(groupErrors).length > 0) {
      setErrors(groupErrors);
      return;
    }
    setErrors({});
    setSuggesting(null);
    setStep(step + 1);
  }

  function back() {
    setErrors({});
    setSuggesting(null);
    setStep(step - 1);
  }

  /**
   * The Dock, with Next, hides while the keyboard is up (UX-007), so the keyboard's Next key moves on: to the group's
   * next field, or to the next group from its last field. The form has no submit button of its own on these steps, so
   * the key is caught here rather than left to submit the form.
   */
  function nextFromKeyboard(event: KeyboardEvent<HTMLFormElement>) {
    if (reviewing || event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    const fields = Array.from(form.current?.querySelectorAll<HTMLElement>("input, select") ?? []);
    const at = fields.indexOf(event.target);
    if (at >= 0 && at < fields.length - 1) fields[at + 1].focus();
    else next();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reviewing) {
      next();
      return;
    }
    const found = await onSubmit(address);
    setErrors(found);
    const groupWithError = ADDRESS_GROUPS.findIndex((group) => group.fields.some((field) => found[field]));
    if (groupWithError >= 0) setStep(groupWithError);
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

  /** One field: a text input with its suggestions, or the State picker. */
  function renderField(field: AddressField) {
    if (field === "state") {
      return (
        <label key={field}>
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
      );
    }
    const spec = textFields.find((each) => each.field === field);
    if (!spec) return null;
    return (
      <Fragment key={field}>
        <label>
          {spec.label}
          <input
            value={address[field] ?? ""}
            onChange={(event) => typeInto(field, event.target.value)}
            inputMode={spec.inputMode}
            enterKeyHint="next"
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
    );
  }

  const nav = reviewing ? (
    <div className="dock-actions">
      <button type="button" className="secondary" onClick={back}>
        <ChevronLeft aria-hidden="true" />
        Back
      </button>
      <button type="submit" form={ADDRESS_FORM_ID} className="primary">
        <Check aria-hidden="true" />
        {startLabel}
      </button>
    </div>
  ) : (
    <div className="dock-actions">
      {step > 0 && (
        <button type="button" className="secondary" onClick={back}>
          <ChevronLeft aria-hidden="true" />
          Back
        </button>
      )}
      <button type="button" className="primary" onClick={next}>
        {step === ADDRESS_GROUPS.length - 1 ? "Review address" : "Next"}
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      <form id={ADDRESS_FORM_ID} ref={form} className="form spaced" onSubmit={submit} onKeyDown={nextFromKeyboard} noValidate>
        {reviewing ? (
          <section className="address-review" aria-label="Check the address">
            <h2>Check the address</h2>
            {ADDRESS_GROUPS.map((group, index) => (
              <div key={group.title} className="address-review-group">
                <dl>
                  {group.fields
                    .filter((field) => address[field])
                    .map((field) => (
                      <Fragment key={field}>
                        <dt>{addressLabel[field]}</dt>
                        <dd>{address[field]}</dd>
                      </Fragment>
                    ))}
                </dl>
                <button type="button" className="link" aria-label={`Edit ${group.title}`} onClick={() => setStep(index)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </button>
              </div>
            ))}
          </section>
        ) : (
          <>
            <StepHeader titles={ADDRESS_GROUPS.map((group) => group.title)} step={step} />
            {ADDRESS_GROUPS[step].fields.map(renderField)}
          </>
        )}
      </form>
      {/* Past the first group, the phone's back gesture steps back one group, as Back in the Dock does. Keyed by step, so each group has its own history entry. */}
      {step > 0 && <BackCloses key={step} onBack={back} />}
      <Dock action={nav} />
    </>
  );
}
