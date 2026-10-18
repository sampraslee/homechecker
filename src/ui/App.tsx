import { useState } from "react";
import { InspectionListScreen } from "./InspectionListScreen";
import { InspectionScreen } from "./InspectionScreen";
import { SettingsScreen } from "./SettingsScreen";
import { StartInspectionScreen } from "./StartInspectionScreen";

export type Screen =
  | { name: "list" }
  | { name: "start" }
  | { name: "inspection"; id: string }
  | { name: "settings" };

export type Navigate = (screen: Screen) => void;

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "list" });

  switch (screen.name) {
    case "list":
      return <InspectionListScreen navigate={setScreen} />;
    case "start":
      return <StartInspectionScreen navigate={setScreen} />;
    case "inspection":
      return <InspectionScreen id={screen.id} navigate={setScreen} />;
    case "settings":
      return <SettingsScreen navigate={setScreen} />;
  }
}
