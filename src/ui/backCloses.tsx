import { useContext, useEffect, useRef } from "react";
import { NavigationContext } from "./App";

/** While the calling panel is open, the phone's back gesture calls `onBack` (to close it) instead of leaving the screen. */
export function useBackCloses(onBack: () => void) {
  const navigation = useContext(NavigationContext);
  const latest = useRef(onBack);
  latest.current = onBack;
  useEffect(() => {
    if (!navigation) return;
    const panel = navigation.openPanel(() => latest.current());
    return () => panel.close();
  }, [navigation]);
}

/** The same for a mode with no panel of its own, such as Edit on the Area screen: render it while the mode is on. */
export function BackCloses({ onBack }: { onBack: () => void }) {
  useBackCloses(onBack);
  return null;
}
