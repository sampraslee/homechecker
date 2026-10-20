import { useEffect, useState } from "react";
import { Check, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Settings, StorageDurability } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
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
      <Band navigate={navigate} back={{ to: { name: "list" }, label: "Inspections" }} title="Settings" />
      <div className="section-head">
        <h2>Inspector</h2>
      </div>
      {settings && (
        <InspectorNameForm initialName={settings.inspectorName ?? ""} onSaved={() => setSaved(true)} />
      )}
      {saved && (
        <p className="status-text kept" role="status">
          <Check className="status-icon" aria-hidden="true" />
          Name saved.
        </p>
      )}
      {settings && <StorageDurabilityNotice durability={settings.storageDurability} />}
      <Dock />
    </main>
  );
}

/** Inspections live only on this phone, so whether the browser keeps them matters. */
function StorageDurabilityNotice({ durability }: { durability: StorageDurability | null }) {
  return (
    <section>
      <div className="section-head">
        <h2>Storage on this phone</h2>
      </div>
      {durability === "granted" && (
        <p className="kept-notice status-text">
          <ShieldCheck className="status-icon" aria-hidden="true" />
          Kept: the browser won't clear Inspections to free up space.
        </p>
      )}
      {durability === "refused" && (
        <p className="notice status-text">
          <TriangleAlert className="status-icon" aria-hidden="true" />
          Only on this phone: the browser may clear Inspections if the phone runs low on space. Export often, especially
          after completing an Inspection.
        </p>
      )}
      {durability === null && <p className="muted">Not checked yet.</p>}
    </section>
  );
}
