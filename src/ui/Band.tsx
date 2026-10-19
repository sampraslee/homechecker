import type { ReactNode } from "react";
import type { Navigate, Screen } from "./App";

/** The dark band at the top of a screen: the way back, the Unit and what this screen is. */
export function Band({
  navigate,
  back,
  unit,
  title,
  action,
  children,
}: {
  navigate: Navigate;
  /** The way back; the Inspections list, the first screen, has none. */
  back?: { to: Screen; label: string };
  /** The Unit's address, so the Inspector can tell one Basin from another. */
  unit?: string;
  title: string;
  /** A button beside the title, such as Edit. */
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="band">
      {back && (
        <button type="button" className="back" aria-label={`Back to ${back.label}`} onClick={() => navigate(back.to)}>
          {back.label}
        </button>
      )}
      {unit && <p className="unit">{unit}</p>}
      <div className="band-title">
        <h1>{title}</h1>
        {action}
      </div>
      {children}
    </header>
  );
}
