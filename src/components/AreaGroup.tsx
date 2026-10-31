import { useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import type { Area, Task } from '../types';
import { counts, sortTasks } from '../lib/tasks';
import { ProgressBar } from './ProgressBar';
import { TaskItem } from './TaskItem';

interface Props {
  area: Area;
  allTasks: Task[]; // every task in this area (for progress)
  visible: Task[]; // filtered tasks in this area
  areas: Area[];
  canEdit: boolean;
  collapsed: boolean;
  filtering: boolean;
  onToggleCollapse: () => void;
  onRename: (oldName: string, newName: string) => boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export function AreaGroup(p: Props) {
  const c = counts(p.allTasks);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(p.area.name);
  const [err, setErr] = useState('');
  const listId = `area-list-${p.area.id}`;

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().replace(/\s+/g, ' ');
    if (!n) return setErr('Name is required.');
    if (!p.onRename(p.area.name, n)) return setErr('An area with that name already exists.');
    setErr('');
    setRenaming(false);
  };

  return (
    <section className="card area" aria-labelledby={`${listId}-h`}>
      <div className="area-head">
        <h2 id={`${listId}-h`} className="area-title">
          <button
            type="button"
            className="collapse-btn"
            aria-expanded={!p.collapsed}
            aria-controls={listId}
            onClick={p.onToggleCollapse}
          >
            <ChevronDown size={20} aria-hidden="true" className="chev" />
            <span className="area-name">{p.area.name}</span>
            <span className="area-count">{c.done}/{c.total}</span>
          </button>
        </h2>
        {p.canEdit && !renaming && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`Rename area ${p.area.name}`}
            onClick={() => {
              setName(p.area.name);
              setRenaming(true);
            }}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {renaming && (
        <form className="rename-form" onSubmit={submitRename}>
          <label className="field">
            <span>Area name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          </label>
          {err && <p className="form-error" role="alert">{err}</p>}
          <div className="edit-actions">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn" onClick={() => { setRenaming(false); setErr(''); }}>Cancel</button>
          </div>
        </form>
      )}
      <ProgressBar value={c.done} max={c.total} label={`${p.area.name} progress`} />
      <div id={listId} hidden={p.collapsed}>
        {p.visible.length === 0 ? (
          <p className="empty-inline">{p.filtering ? 'No matching tasks in this area.' : 'No tasks in this area yet.'}</p>
        ) : (
          <ul className="task-list">
            {sortTasks(p.visible).map((t) => (
              <TaskItem key={t.id} task={t} areas={p.areas} canEdit={p.canEdit} onToggle={p.onToggle} onUpdate={p.onUpdate} onDelete={p.onDelete} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
