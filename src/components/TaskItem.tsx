import { useState } from 'react';
import { Pencil, Trash2, User, Check, X } from 'lucide-react';
import type { Area, Priority, Task } from '../types';
import { PRIORITIES } from '../types';

interface Props {
  task: Task;
  areas: Area[];
  canEdit: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export function TaskItem({ task, areas, canEdit, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [area, setArea] = useState(task.area);
  const [assignee, setAssignee] = useState(task.assignee ?? '');
  const cbId = `task-${task.id}`;

  const startEdit = () => {
    setTitle(task.title);
    setPriority(task.priority);
    setArea(task.area);
    setAssignee(task.assignee ?? '');
    setEditing(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onUpdate(task.id, { title: t, priority, area, assignee: assignee.trim() || null });
    setEditing(false);
  };

  const del = () => {
    if (window.confirm(`Delete "${task.title}"? This can't be undone.`)) onDelete(task.id);
  };

  return (
    <li className={`task${task.done ? ' is-done' : ''}`} data-priority={task.priority}>
      <div className="task-row">
        {canEdit ? (
          <input id={cbId} type="checkbox" className="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
        ) : (
          <span className={`checkbox-ro${task.done ? ' on' : ''}`} role="img" aria-label={task.done ? 'Done' : 'Not done'}>
            {task.done && <Check size={16} aria-hidden="true" />}
          </span>
        )}
        <div className="task-main">
          {canEdit ? (
            <label htmlFor={cbId} className="task-title">{task.title}</label>
          ) : (
            <span className="task-title">{task.title}</span>
          )}
          <div className="task-meta">
            {task.priority !== 'Normal' && <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>}
            {task.assignee && (
              <span className="meta-item"><User size={14} aria-hidden="true" /> {task.assignee}</span>
            )}
            {task.done && task.completedAt && <span className="meta-item">Done {fmt(task.completedAt)}</span>}
          </div>
        </div>
        {canEdit && !editing && (
          <button type="button" className="icon-btn" onClick={startEdit} aria-label={`Edit "${task.title}"`}>
            <Pencil size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {canEdit && editing && (
        <form className="task-edit" onSubmit={save} aria-label={`Edit "${task.title}"`}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required autoFocus />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Area</span>
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {areas.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Assignee</span>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} list="assignee-list" maxLength={120} placeholder="Unassigned" />
            </label>
          </div>
          <div className="edit-actions">
            <button type="submit" className="btn btn-primary"><Check size={18} aria-hidden="true" /> Save</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}><X size={18} aria-hidden="true" /> Cancel</button>
            <button type="button" className="btn btn-danger" onClick={del}><Trash2 size={18} aria-hidden="true" /> Delete</button>
          </div>
        </form>
      )}
    </li>
  );
}
