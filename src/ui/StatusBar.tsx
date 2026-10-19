import { useCallback, useState } from "react";
import { useHomeCheck } from "./homeCheckContext";
import { useAiChanges } from "./useAiChanges";

/** Always on screen: everything is kept on the phone, and how many photos still wait for AI. */
export function StatusBar() {
  const homeCheck = useHomeCheck();
  const [waiting, setWaiting] = useState<number | null>(null);
  useAiChanges(
    useCallback(() => {
      homeCheck.countWaitingForAi().then(setWaiting);
    }, [homeCheck]),
  );

  return (
    <footer className="status-bar" role="status">
      <span>Saved on device</span>
      {waiting !== null && <span>Waiting for AI: {waiting === 1 ? "1 photo" : `${waiting} photos`}</span>}
    </footer>
  );
}
