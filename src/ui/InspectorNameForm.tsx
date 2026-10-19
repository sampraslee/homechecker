import { useState, type FormEvent } from "react";
import { refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

export function InspectorNameForm({ initialName = "", onSaved }: { initialName?: string; onSaved: (name: string) => void }) {
  const homeCheck = useHomeCheck();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = await homeCheck.setInspectorName(name);
    if (!result.ok) {
      setError(refusalMessage[result.reason]);
      return;
    }
    setError(null);
    onSaved(result.inspectorName);
  }

  return (
    <form className="form" onSubmit={save} noValidate>
      <label>
        Your name
        <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
        {error && <span className="error" role="alert">{error}</span>}
      </label>
      <button type="submit" className="primary">
        Save name
      </button>
    </form>
  );
}
