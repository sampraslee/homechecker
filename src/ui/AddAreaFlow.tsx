import { useEffect, useState, type FormEvent } from "react";
import type { AreaSource } from "../core";
import type { Navigate } from "./App";
import { BackCloses } from "./backCloses";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { StepFooter } from "./StepFooter";
import { StepBar, StepHeader } from "./StepHeader";

/** A standard Area is added with its default name; only "Not in the list" goes on to name it. */
const STEPS = ["Which Area?", "Name it"];

const ADD_AREA_FORM_ID = "add-area-form";

/**
 * The rooms on the placeholder plan, each a shortcut to a standard Area. The plan is generic and stores nothing; real
 * layouts would need per-Unit data we don't capture.
 */
const PLAN_ROOMS = [
  { id: "living-room", className: "living" },
  { id: "master-bedroom", className: "master" },
  { id: "bedroom", className: "bedroom" },
  { id: "dry-kitchen", className: "kitchen" },
  { id: "common-bathroom", className: "bathroom" },
] as const;

/** What the Inspector picked in step 1: a standard Area, or a name of their own. */
type Choice = { kind: "standard"; id: string; name: string } | { kind: "other" };

/**
 * Adding an Area: pick which one, and a standard Area is added at once with its standard name. If the Inspection
 * already has an Area of that name (a second bathroom), or the Inspector picked "Not in the list", a second step asks
 * what to call it. Lands in the new Area, ready to add Items.
 */
export function AddAreaFlow({
  inspectionId,
  unit,
  navigate,
  onCancel,
}: {
  inspectionId: string;
  unit: string;
  navigate: Navigate;
  onCancel: () => void;
}) {
  const homeCheck = useHomeCheck();
  const [standardAreas, setStandardAreas] = useState<{ id: string; name: string }[]>([]);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [name, setName] = useState("");
  /** Which standard Area the typed name belongs to, so going back and forward again keeps what was typed. */
  const [namedFor, setNamedFor] = useState<string | null>(null);
  /** The name a picked standard Area would get, which differs from its standard name when the Inspection already has one. */
  const [suggested, setSuggested] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    homeCheck.listStandardAreas().then(setStandardAreas);
  }, [homeCheck]);

  /** A standard Area whose name is taken has to be named; so does one that isn't in the list. */
  const needsName = choice?.kind === "other" || (choice?.kind === "standard" && suggested?.id === choice.id && suggested.name !== choice.name);

  function next() {
    // Starts from the suggestion, e.g. "Bathroom 2", unless a name for this very Area was already typed.
    if (choice?.kind === "standard" && suggested?.id === choice.id && namedFor !== choice.id) {
      setName(suggested.name);
      setNamedFor(choice.id);
    }
    setError(null);
    setStep(1);
  }

  function back() {
    setError(null);
    setStep(0);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!choice) return;
    if (step === 0 && needsName) return next();
    const source: AreaSource =
      choice.kind === "other" ? { customName: name } : needsName ? { standardAreaId: choice.id, name } : { standardAreaId: choice.id };
    const result = await homeCheck.addArea(inspectionId, source);
    if (result.ok) navigate({ name: "area", id: result.area.id, addingItem: true }, { replace: true });
    else setError(refusalMessage[result.reason]);
  }

  const planIds: string[] = PLAN_ROOMS.map((room) => room.id);
  const nameOf = (id: string) => standardAreas.find((area) => area.id === id)?.name ?? id;
  function pick(id: string) {
    setChoice({ kind: "standard", id, name: nameOf(id) });
    homeCheck.defaultAreaName(inspectionId, id).then((result) => setSuggested(result.ok ? { id, name: result.name } : null));
  }
  const picked = (id: string) => choice?.kind === "standard" && choice.id === id;

  const titles = needsName ? STEPS : STEPS.slice(0, 1);
  /** The right button saves unless a second step still has to name the Area. */
  const saves = step > 0 || !needsName;
  /** A standard Area waits for its name to be worked out (it may be taken) before it can be added. */
  const waiting = !choice || (step === 0 && choice.kind === "standard" && suggested?.id !== choice.id);

  return (
    <main className="screen">
      <Band
        navigate={navigate}
        back={step === 0 ? { onBack: onCancel, label: "Inspection" } : { onBack: back, label: "Which Area?" }}
        unit={unit}
        title="Add Area"
      />
      {/* The phone's back gesture steps back a step, then leaves, as Back does. */}
      <BackCloses onBack={onCancel} />
      {step > 0 && <BackCloses key={step} onBack={back} />}

      <form id={ADD_AREA_FORM_ID} className="form spaced" onSubmit={submit} noValidate>
        <StepHeader titles={titles} step={step} bar={false} />
        {step === 0 ? (
          <>
            <div className="plan" role="group" aria-label="Floor plan">
              {PLAN_ROOMS.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`plan-room ${room.className}`}
                  aria-pressed={picked(room.id)}
                  onClick={() => pick(room.id)}
                >
                  {nameOf(room.id)}
                </button>
              ))}
            </div>
            <p className="muted plan-note">Placeholder plan: tap a room, or choose below.</p>

            <h3>Other Areas</h3>
            <div className="chips">
              {standardAreas
                .filter((area) => !planIds.includes(area.id))
                .map((area) => (
                  <button key={area.id} type="button" className="chip" aria-pressed={picked(area.id)} onClick={() => pick(area.id)}>
                    {area.name}
                  </button>
                ))}
              <button type="button" className="chip other-chip" aria-pressed={choice?.kind === "other"} onClick={() => setChoice({ kind: "other" })}>
                Not in the list
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <label>
            {choice?.kind === "standard"
              ? `There is already a ${choice.name}. What is this one called?`
              : "What is this Area called?"}
            <input value={name} onChange={(event) => setName(event.target.value)} autoFocus aria-invalid={Boolean(error)} />
            {error && (
              <span className="error" role="alert">
                {error}
              </span>
            )}
          </label>
        )}
      </form>
      <Dock
        message={titles.length > 1 ? <StepBar titles={titles} step={step} /> : undefined}
        action={
          <StepFooter
            onBack={step === 0 ? onCancel : back}
            onNext={() => submit()}
            nextLabel={saves ? "Add Area" : "Next"}
            nextDisabled={waiting}
          />
        }
      />
    </main>
  );
}
