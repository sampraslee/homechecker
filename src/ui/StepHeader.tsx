/** The segmented progress bar: one segment per step, filled up to the current one. */
export function StepBar({ titles, step }: { titles: string[]; step: number }) {
  return (
    <div className="steps" aria-hidden="true">
      {titles.map((title, index) => (
        <span key={title} className={index <= step ? "reached" : undefined} />
      ))}
    </div>
  );
}

/**
 * How far through a guided flow the Inspector is: a segmented bar, "Step n of N", and this step's question. A single
 * step is just its question. `bar={false}` leaves the bar out, for a flow that shows it above its footer with `StepBar`.
 */
export function StepHeader({ titles, step, bar = true }: { titles: string[]; step: number; bar?: boolean }) {
  if (titles.length === 1) return <h2>{titles[0]}</h2>;
  return (
    <div className="step-heading">
      {bar && <StepBar titles={titles} step={step} />}
      <p className="muted">
        Step {step + 1} of {titles.length}
      </p>
      <h2>{titles[step]}</h2>
    </div>
  );
}
