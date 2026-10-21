/** How far through a guided flow the Inspector is: a segmented bar, "Step n of N", and this step's question. A single step is just its question. */
export function StepHeader({ titles, step }: { titles: string[]; step: number }) {
  if (titles.length === 1) return <h2>{titles[0]}</h2>;
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
