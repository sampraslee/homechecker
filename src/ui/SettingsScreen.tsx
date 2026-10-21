import { useEffect, useState } from "react";
import { Check, FlaskConical, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Settings, StorageDurability } from "../core";
import type { Navigate } from "./App";
import { Band } from "./Band";
import { Dock } from "./Dock";
import { useHomeCheck } from "./homeCheckContext";
import { InspectorNameForm } from "./InspectorNameForm";
import { loadSampleInspections } from "./sampleData";

export function SettingsScreen({ navigate }: { navigate: Navigate }) {
  const homeCheck = useHomeCheck();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [samplesLoaded, setSamplesLoaded] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  async function loadSamples() {
    setLoadingSamples(true);
    setSampleError(null);
    try {
      await loadSampleInspections(homeCheck);
      setSamplesLoaded(true);
      setSettings(await homeCheck.getSettings());
    } catch {
      setSampleError("The sample Inspections could not be added. Some may have been added before it stopped.");
    } finally {
      setLoadingSamples(false);
    }
  }

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
      <section>
        <div className="section-head">
          <h2>Sample data</h2>
        </div>
        <p className="muted">Adds three sample Inspections to try the app with. Delete them from their own screen.</p>
        <button type="button" className="secondary" onClick={loadSamples} disabled={loadingSamples}>
          <FlaskConical aria-hidden="true" />
          {loadingSamples ? "Adding…" : "Load sample Inspections"}
        </button>
        {samplesLoaded && (
          <p className="status-text kept" role="status">
            <Check className="status-icon" aria-hidden="true" />
            Added three sample Inspections.
          </p>
        )}
        {sampleError && <p className="error" role="alert">{sampleError}</p>}
      </section>
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
