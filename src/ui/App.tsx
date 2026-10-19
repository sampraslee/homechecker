import { useState } from "react";
import { AreaScreen } from "./AreaScreen";
import { InspectionListScreen } from "./InspectionListScreen";
import { InspectionScreen } from "./InspectionScreen";
import { ItemScreen } from "./ItemScreen";
import { SettingsScreen } from "./SettingsScreen";
import { StartInspectionScreen } from "./StartInspectionScreen";

export type Screen =
  | { name: "list" }
  | { name: "start" }
  | { name: "inspection"; id: string }
  /** `addingItem`: opened straight after the Area was added, so Add Item is already open. */
  | { name: "area"; id: string; addingItem?: boolean }
  | { name: "item"; id: string }
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
    case "area":
      return <AreaScreen id={screen.id} addingItem={screen.addingItem} navigate={setScreen} />;
    case "item":
      return <ItemScreen id={screen.id} navigate={setScreen} />;
    case "settings":
      return <SettingsScreen navigate={setScreen} />;
  }
}
