/** The footer of a guided flow: `Back` as an underlined link on the left, `Next` as a deep teal button on the right. */
export function StepFooter({ onBack, onNext, nextDisabled = false }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="step-footer">
      <button type="button" className="step-back" onClick={onBack}>
        Back
      </button>
      <button type="button" className="step-next" disabled={nextDisabled} onClick={onNext}>
        Next
      </button>
    </div>
  );
}
