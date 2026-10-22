import { useEffect, useRef, useState, type ReactNode } from "react";

/** How long the sheet takes to slide down; matches the CSS. */
const SHEET_OUT_MS = 200;

/**
 * A bottom sheet over the screen: it slides up, and slides back down before `then` runs, which is where the parent
 * unmounts it. Tapping outside or pressing Escape closes it, as Cancel does. `children` gets the `leave` that Cancel
 * and Save should call, so closing from inside slides down too.
 */
export function Sheet({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: (leave: (then: () => void) => void) => ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  function leave(then: () => void) {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return then();
    setLeaving(true);
    setTimeout(then, SHEET_OUT_MS);
  }

  // Focus moves into the sheet and back to the tapped button on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    if (!sheet.current?.contains(document.activeElement)) sheet.current?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <div className={leaving ? "sheet-backdrop leaving" : "sheet-backdrop"} onClick={() => leave(onClose)}>
      <div
        className="panel sheet"
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          leave(onClose);
        }}
      >
        {children(leave)}
      </div>
    </div>
  );
}
