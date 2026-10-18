import type { Navigate } from "./App";

export function BackBar({ navigate }: { navigate: Navigate }) {
  return (
    <header className="bar">
      <button type="button" className="link" onClick={() => navigate({ name: "list" })}>
        ‹ Inspections
      </button>
    </header>
  );
}
