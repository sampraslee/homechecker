import { Lock } from "lucide-react";
import { lockedNotice } from "./format";

/**
 * In the Band of a Completed Inspection's screens: a quiet "Completed · Locked" pill, not a warning box, since Completed is
 * the expected end state (UX-031). The full sentence is its accessible name.
 */
export function LockedNotice() {
  return (
    <p className="locked-pill-row">
      <span className="locked-pill" role="note" aria-label={lockedNotice}>
        <Lock className="status-icon" aria-hidden="true" />
        Completed · Locked
      </span>
    </p>
  );
}
