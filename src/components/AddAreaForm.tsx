import { useState } from 'react';
import { FolderPlus } from 'lucide-react';

export function AddAreaForm({ onAdd }: { onAdd: (name: string) => boolean }) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, ' ');
    if (!n) return setMsg('Enter an area name.');
    if (!onAdd(n)) return setMsg('That area already exists.');
    setName('');
    setMsg('');
  };
  return (
    <form className="card add-area" onSubmit={submit}>
      <label className="field grow">
        <span>New area</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laundry Room" maxLength={120} />
      </label>
      <button type="submit" className="btn">
        <FolderPlus size={18} aria-hidden="true" /> Add area
      </button>
      {msg && <p className="form-error" role="alert">{msg}</p>}
    </form>
  );
}
