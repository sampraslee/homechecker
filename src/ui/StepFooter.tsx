/**
 * The footer of a guided flow: `Back` as an underlined link on the left, `Next` as a deep teal button on the right.
 * `nextLabel` renames the button; leave out `onNext` for a screen with nothing to do next, so only `Back` shows.
 */
export function StepFooter({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="step-footer">
      <button type="button" className="step-back" onClick={onBack}>
        Back
      </button>
      {onNext && (
        <button type="button" className="step-next" disabled={nextDisabled} onClick={onNext}>
          {nextLabel}
        </button>
      )}
    </div>
  );
}
