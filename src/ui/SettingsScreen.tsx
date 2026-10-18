import { useEffect, useState } from "react";
import type { Settings } from "../core";
import type { Navigate } from "./App";
import { BackBar } from "./BackBar";
import { useHomeCheck } from "./homeCheckContext";
import { InspectorNameForm } from "./InspectorNameForm";

export function SettingsScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    homeCheck.getSettings().then(setSettings);
  }, [homeCheck]);

  return (
    <main className="screen">
      <BackBar navigate={navigate} />
      <h1>Settings</h1>
      {settings && (
        <InspectorNameForm initialName={settings.inspectorName ?? ""} onSaved={() => setSaved(true)} />
      )}
      {saved && <p className="muted">Name saved.</p>}
    </main>
  );
}
