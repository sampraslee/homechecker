import { useSyncExternalStore } from "react";

// The core refuses with `{ ok: false, reason }`; anything it throws instead (an IndexedDB
// failure, a missing browser API, a bug) is unexpected. Screens don't catch those, so they
// surface here as unhandled errors and the Inspector is told, rather than the button
// appearing to do nothing.

let shown: string | null = null;
const subscribers = new Set<() => void>();

function setShown(details: string | null) {
  shown = details;
  subscribers.forEach((notify) => notify());
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Browsers report a layout change that landed mid-measurement as an `error` event. Nothing failed, so it isn't
 * shown (the same notice is worded "loop limit exceeded" in older Chrome).
 */
function isResizeObserverNotice(message: string): boolean {
  return message.startsWith("ResizeObserver loop");
}

/** Call once, before the first core call, so nothing thrown at start-up is missed. */
export function listenForUnexpectedErrors() {
  window.addEventListener("unhandledrejection", (event) => setShown(describe(event.reason)));
  window.addEventListener("error", (event) => {
    if (isResizeObserverNotice(event.message)) return;
    setShown(describe(event.error ?? event.message));
  });
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

export function ErrorNotice() {
  const details = useSyncExternalStore(subscribe, () => shown);
  if (details === null) return null;

  return (
    <div className="error-notice" role="alert">
      <div className="error-notice-row">
        <p>That may not have saved. Try again.</p>
        <button type="button" className="secondary" onClick={() => setShown(null)}>
          Close
        </button>
      </div>
      <details>
        <summary>Details to send to the Home Check team</summary>
        <code>{details}</code>
      </details>
    </div>
  );
}
