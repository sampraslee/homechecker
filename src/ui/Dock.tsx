import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { StorageDurability } from "../core";
import { useHomeCheck } from "./homeCheckContext";
import { useAiChanges } from "./useAiChanges";

/**
 * The bottom of every screen, in thumb reach: a passing message, whether Inspections are safe on
 * this phone, how many photos wait for AI, and the screen's main button.
 */
export function Dock({ message, action }: { message?: ReactNode; action?: ReactNode }) {
  const homeCheck = useHomeCheck();
  const [waiting, setWaiting] = useState(0);
  const [durability, setDurability] = useState<StorageDurability | null>(null);

  useAiChanges(
    useCallback(() => {
      homeCheck.countWaitingForAi().then(setWaiting);
    }, [homeCheck]),
  );
  useEffect(() => {
    homeCheck.getSettings().then((settings) => setDurability(settings.storageDurability));
  }, [homeCheck]);

  return (
    <footer className="dock">
      <div className="dock-inner">
        {message}
        <p className="status-line" role="status">
          {durability === "refused" ? (
            <span className="not-kept">Not kept on this phone: export soon</span>
          ) : (
            <span className="kept">Saved on this phone</span>
          )}
          {waiting > 0 && <span className="ai-waiting">{waiting === 1 ? "1 photo" : `${waiting} photos`} waiting for AI</span>}
        </p>
        {action}
      </div>
    </footer>
  );
}
