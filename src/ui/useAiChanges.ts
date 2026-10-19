import { useEffect } from "react";
import { useHomeCheck } from "./homeCheckContext";

/** Calls `onChange` now, and again whenever photos join or leave the AI queue or AI Suggestions arrive or are reviewed. */
export function useAiChanges(onChange: () => void) {
  const homeCheck = useHomeCheck();
  useEffect(() => {
    onChange();
    return homeCheck.onAiChange(onChange);
  }, [homeCheck, onChange]);
}
