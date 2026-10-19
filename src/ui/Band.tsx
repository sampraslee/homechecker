import type { ReactNode } from "react";
import type { Navigate, Screen } from "./App";

/** The dark band at the top of a screen: the way back, the Unit and what this screen is. */
export function Band({
  navigate,
  back,
  unit,
  title,
  children,
}: {
  navigate: Navigate;
  back: { to: Screen; label: string };
  /** The Unit's address, so the Inspector can tell one Basin from another. */
  unit?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="band">
      <button type="button" className="back" onClick={() => navigate(back.to)}>
        {back.label}
      </button>
      {unit && <p className="unit">{unit}</p>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}
