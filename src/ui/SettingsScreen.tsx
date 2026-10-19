import { useEffect, useState } from "react";
import type { Settings, StorageDurability } from "../core";
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
      {settings && <StorageDurabilityNotice durability={settings.storageDurability} />}
    </main>
  );
}

/** Inspections live only on this phone, so whether the browser keeps them matters. */
function StorageDurabilityNotice({ durability }: { durability: StorageDurability | null }) {
  return (
    <section className="spaced">
      <h2>Storage on this phone</h2>
      {durability === "granted" && <p>Kept: the browser won't clear Inspections to free up space.</p>}
      {durability === "refused" && (
        <>
          <p>Not kept: the browser may clear Inspections if the phone runs low on space.</p>
          <p className="muted">Export often, especially after completing an Inspection.</p>
        </>
      )}
      {durability === null && <p className="muted">Not checked yet.</p>}
    </section>
  );
}
