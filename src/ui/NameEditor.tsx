import { useState, type FormEvent } from "react";

/** An inline name field with Save and Cancel. `onSave` returns an error message, or null when saved. */
export function NameEditor({
  initialName,
  label,
  onSave,
  onCancel,
}: {
  initialName: string;
  label: string;
  onSave: (name: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(await onSave(name));
  }

  return (
    <form className="form inline-form" onSubmit={save} noValidate>
      <label>
        {label}
        <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        {error && <span className="error" role="alert">{error}</span>}
      </label>
      <div className="button-row">
        <button type="submit" className="primary">
          Save name
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
