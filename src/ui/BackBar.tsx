import type { Navigate, Screen } from "./App";

export function BackBar({
  navigate,
  to = { name: "list" },
  label = "Inspections",
}: {
  navigate: Navigate;
  to?: Screen;
  label?: string;
}) {
  return (
    <header className="bar">
      <button type="button" className="link" onClick={() => navigate(to)}>
        ‹ {label}
      </button>
    </header>
  );
}
