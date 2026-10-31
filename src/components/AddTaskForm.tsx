import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Area, Priority } from '../types';
import { PRIORITIES } from '../types';
import type { NewTask } from '../lib/useHomebase';

export function AddTaskForm({ areas, onAdd }: { areas: Area[]; onAdd: (t: NewTask) => void }) {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [assignee, setAssignee] = useState('');
  const [err, setErr] = useState('');
  const areaValue = area || areas[0]?.name || '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setErr('Enter a task title.');
    if (!areaValue) return setErr('Add an area first.');
    onAdd({ title: t, area: areaValue, priority, assignee: assignee.trim() || null });
    setTitle('');
    setErr('');
  };

  return (
    <details className="card add-task">
      <summary>
        <Plus size={20} aria-hidden="true" />
        <span>Add a task</span>
      </summary>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Task</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Patch hallway ceiling"
            maxLength={300}
            aria-invalid={!!err && !title.trim()}
            aria-describedby={err ? 'add-err' : undefined}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Area</span>
            <select value={areaValue} onChange={(e) => setArea(e.target.value)}>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Assignee (optional)</span>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} list="assignee-list" maxLength={120} placeholder="Name" />
          </label>
        </div>
        {err && <p id="add-err" className="form-error" role="alert">{err}</p>}
        <button type="submit" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" /> Add task
        </button>
      </form>
    </details>
  );
}
