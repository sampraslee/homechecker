import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import type { StorageDurability } from "../core";
import { useHomeCheck } from "./homeCheckContext";
import { useAiChanges } from "./useAiChanges";

/** The most of the screen's height the Dock may cover. */
const MAX_SCREEN_SHARE = 1 / 3;

/**
 * Whether Inspections are kept on this phone, with the export that keeps a copy. It sits beside Export, where the
 * Inspector can act on it, rather than in the Dock (UX-002, UX-015).
 */
export function StorageNote() {
  const homeCheck = useHomeCheck();
  const [durability, setDurability] = useState<StorageDurability | null>(null);
  useEffect(() => {
    homeCheck.getSettings().then((settings) => setDurability(settings.storageDurability));
  }, [homeCheck]);

  return (
    <p className="status-line" role="status">
      {durability === "refused" ? <span className="not-kept">Not kept on this phone: export soon</span> : <span className="kept">Saved on this phone</span>}
    </p>
  );
}

/**
 * The bottom of every screen, in thumb reach: a passing message, whether the phone is offline, how many photos
 * wait for AI, and the screen's main button.
 */
export function Dock({ message, action }: { message?: ReactNode; action?: ReactNode }) {
  const homeCheck = useHomeCheck();
  const [waiting, setWaiting] = useState(0);
  const dock = useRef<HTMLElement>(null);
  /** With very large text the Dock would cover too much of the screen, so it joins the end of the page instead. */
  const [inFlow, setInFlow] = useState(false);

  // The page keeps this much room at the bottom, so nothing focused or scrolled to ends up behind the Dock.
  useEffect(() => {
    const element = dock.current;
    if (!element) return;
    const root = document.documentElement;
    const measure = () => {
      const tooTall = element.offsetHeight > window.innerHeight * MAX_SCREEN_SHARE;
      setInFlow(tooTall);
      root.style.setProperty("--dock-height", tooTall ? "0px" : `${element.offsetHeight}px`);
    };
    measure();
    // Text size, a message or a wrapped status line can all change the Dock's height.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--dock-height");
    };
  }, []);

  useAiChanges(
    useCallback(() => {
      homeCheck.countWaitingForAi().then(setWaiting);
    }, [homeCheck]),
  );
  /** AI Suggestions only arrive online, so the status line says when the phone is offline (UX-009). It never blocks anything. */
  const [online, setOnline] = useState(() => homeCheck.isOnline());
  useEffect(() => homeCheck.onOnlineChange(setOnline), [homeCheck]);

  return (
    <footer className={inFlow ? "dock in-flow" : "dock"} ref={dock}>
      <div className="dock-inner">
        {message}
        {/* Left out when there's nothing to say, so the Dock stays short. */}
        {(!online || waiting > 0) && (
          <p className="status-line" role="status">
            {!online ? (
              <span className="offline">
                <WifiOff className="status-icon" aria-hidden="true" />
                {waiting > 0 ? "Offline: AI Suggestions will come when you're back online" : "Offline"}
              </span>
            ) : (
              waiting > 0 && <span className="ai-waiting">{waiting === 1 ? "1 photo" : `${waiting} photos`} waiting for AI</span>
            )}
          </p>
        )}
        {action}
      </div>
    </footer>
  );
}
