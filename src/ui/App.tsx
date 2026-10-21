import { createContext, useEffect, useState } from "react";
import { AreaScreen } from "./AreaScreen";
import { InspectionListScreen } from "./InspectionListScreen";
import { InspectionScreen } from "./InspectionScreen";
import { ItemScreen } from "./ItemScreen";
import { createNavigation, type Direction, type Navigation } from "./navigation";
import { SettingsScreen } from "./SettingsScreen";
import { StartInspectionScreen } from "./StartInspectionScreen";

export type Screen =
  | { name: "list" }
  | { name: "start" }
  | { name: "inspection"; id: string }
  /** `addingItem`: opened straight after the Area was added, so Add Item is already open. */
  | { name: "area"; id: string; addingItem?: boolean }
  /** `recordingDefect`: opened straight after the Item was added, so Record a Defect is already open. */
  | { name: "item"; id: string; recordingDefect?: boolean }
  | { name: "settings" };

/**
 * Moves to a screen. `up`: to the screen above, as the band's back button and Done do.
 * `replace`: leaves no way back to the current screen, as after Start Inspection.
 */
export type Navigate = (screen: Screen, options?: { up?: boolean; replace?: boolean }) => void;

/** How long a screen's slide in takes; matches the CSS. */
const SLIDE_MS = 250;

/** Lets panels give themselves a history entry, so the back gesture closes them. */
export const NavigationContext = createContext<Navigation | null>(null);

export function App() {
  const [shown, setShown] = useState<{ screen: Screen; direction?: Direction }>({ screen: { name: "list" } });
  const [navigation] = useState(() =>
    createNavigation(window.history, (screen, direction) => setShown({ screen, direction })),
  );

  // The slide plays once, as the screen arrives; panels opened later don't slide.
  useEffect(() => {
    if (!shown.direction) return;
    const timer = setTimeout(() => setShown((current) => ({ screen: current.screen })), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  useEffect(() => {
    navigation.start({ name: "list" });
    const onPop = (event: PopStateEvent) => navigation.pop(event.state);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [navigation]);

  const navigate: Navigate = (screen, { up = false, replace = false } = {}) =>
    up ? navigation.up(screen) : navigation.go(screen, { replace });
  const { screen, direction } = shown;

  return (
    <NavigationContext.Provider value={navigation}>
      {/* Keyed by place, so each screen starts fresh and slides in the direction travelled. */}
      <div key={`${screen.name}:${"id" in screen ? screen.id : ""}`} className={direction ? `arriving ${direction}` : undefined}>
        <CurrentScreen screen={screen} navigate={navigate} />
      </div>
    </NavigationContext.Provider>
  );
}

function CurrentScreen({ screen, navigate }: { screen: Screen; navigate: Navigate }) {
  switch (screen.name) {
    case "list":
      return <InspectionListScreen navigate={navigate} />;
    case "start":
      return <StartInspectionScreen navigate={navigate} />;
    case "inspection":
      return <InspectionScreen id={screen.id} navigate={navigate} />;
    case "area":
      return <AreaScreen id={screen.id} addingItem={screen.addingItem} navigate={navigate} />;
    case "item":
      return <ItemScreen id={screen.id} navigate={navigate} recordingDefect={screen.recordingDefect} />;
    case "settings":
      return <SettingsScreen navigate={navigate} />;
  }
}
