import { useState } from "react";
import { AreaScreen } from "./AreaScreen";
import { Dock } from "./Dock";
import { InspectionListScreen } from "./InspectionListScreen";
import { InspectionScreen } from "./InspectionScreen";
import { ItemScreen } from "./ItemScreen";
import { SettingsScreen } from "./SettingsScreen";
import { StartInspectionScreen } from "./StartInspectionScreen";

export type Screen =
  | { name: "list" }
  | { name: "start" }
  | { name: "inspection"; id: string }
  | { name: "area"; id: string }
  | { name: "item"; id: string }
  | { name: "settings" };

export type Navigate = (screen: Screen) => void;

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  return (
    <>
      <CurrentScreen screen={screen} navigate={setScreen} />
      {/* The Item and Area screens put their main button in their own Dock; the other screens move theirs there next. */}
      {screen.name !== "item" && screen.name !== "area" && <Dock />}
    </>
  );
}

function CurrentScreen({ screen, navigate: setScreen }: { screen: Screen; navigate: Navigate }) {
  switch (screen.name) {
    case "list":
      return <InspectionListScreen navigate={setScreen} />;
    case "start":
      return <StartInspectionScreen navigate={setScreen} />;
    case "inspection":
      return <InspectionScreen id={screen.id} navigate={setScreen} />;
    case "area":
      return <AreaScreen id={screen.id} navigate={setScreen} />;
    case "item":
      return <ItemScreen id={screen.id} navigate={setScreen} />;
    case "settings":
      return <SettingsScreen navigate={setScreen} />;
  }
}
