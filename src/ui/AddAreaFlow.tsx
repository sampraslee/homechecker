import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { AreaSource } from "../core";
import type { Navigate } from "./App";
import { BackCloses } from "./backCloses";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";
import { StepHeader } from "./StepHeader";

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

const choiceKey = (choice: Choice) => (choice.kind === "standard" ? choice.id : "other");

/**
 * Adding an Area in two steps, one decision each: which Area, then what to call it. Lands in the new Area, ready to add
 * Items.
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
  /** Which choice the name was filled in for, so going back and forward again keeps what was typed. */
  const [namedFor, setNamedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    homeCheck.listStandardAreas().then(setStandardAreas);
  }, [homeCheck]);

  async function next() {
    if (!choice) return;
    if (namedFor !== choiceKey(choice)) {
      const suggested = choice.kind === "standard" ? await homeCheck.defaultAreaName(inspectionId, choice.id) : null;
      setName(suggested?.ok ? suggested.name : "");
      setNamedFor(choiceKey(choice));
    }
    setError(null);
    setStep(1);
  }

  function back() {
    setError(null);
    setStep(0);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 0) return next();
    if (!choice) return;
    const source: AreaSource = choice.kind === "standard" ? { standardAreaId: choice.id, name } : { customName: name };
    const result = await homeCheck.addArea(inspectionId, source);
    if (result.ok) navigate({ name: "area", id: result.area.id, addingItem: true }, { replace: true });
    else setError(refusalMessage[result.reason]);
  }

  const planIds: string[] = PLAN_ROOMS.map((room) => room.id);
  const nameOf = (id: string) => standardAreas.find((area) => area.id === id)?.name ?? id;
  const pick = (id: string) => setChoice({ kind: "standard", id, name: nameOf(id) });
  const picked = (id: string) => choice?.kind === "standard" && choice.id === id;

  const nav =
    step === 0 ? (
      <div className="dock-actions">
        <button type="submit" form={ADD_AREA_FORM_ID} className="primary" disabled={!choice}>
          Next
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    ) : (
      <div className="dock-actions">
        <button type="button" className="secondary" onClick={back}>
          <ChevronLeft aria-hidden="true" />
          Back
        </button>
        <button type="submit" form={ADD_AREA_FORM_ID} className="primary">
          <Check aria-hidden="true" />
          Add Area
        </button>
      </div>
    );

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
        <StepHeader titles={STEPS} step={step} />
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
          </>
        ) : (
          <label>
            {choice?.kind === "other" ? "What is this Area called?" : "Name of this Area"}
            <input value={name} onChange={(event) => setName(event.target.value)} autoFocus aria-invalid={Boolean(error)} />
            {error && (
              <span className="error" role="alert">
                {error}
              </span>
            )}
          </label>
        )}
      </form>
      <Dock action={nav} />
    </main>
  );
}
