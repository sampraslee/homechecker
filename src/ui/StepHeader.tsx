/** How far through a guided flow the Inspector is: a segmented bar, "Step n of N", and this step's question. */
export function StepHeader({ titles, step }: { titles: string[]; step: number }) {
  return (
    <>
      <div className="steps" aria-hidden="true">
        {titles.map((title, index) => (
          <span key={title} className={index <= step ? "reached" : undefined} />
        ))}
      </div>
      <p className="muted">
        Step {step + 1} of {titles.length}
      </p>
      <h2>{titles[step]}</h2>
    </>
  );
}
