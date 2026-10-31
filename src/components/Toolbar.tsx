import { Search, X } from 'lucide-react';
import type { Area } from '../types';
import type { Filters, StatusFilter } from '../lib/tasks';
import { UNASSIGNED } from '../lib/tasks';

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'complete', label: 'Complete' },
  { value: 'high', label: 'High priority' },
];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  areas: Area[];
  assignees: string[];
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

export function Toolbar({ filters, onChange, areas, assignees, onCollapseAll, onExpandAll }: Props) {
  const set = (p: Partial<Filters>) => onChange({ ...filters, ...p });
  return (
    <section className="card toolbar" aria-label="Search and filters">
      <div className="search">
        <label htmlFor="search" className="visually-hidden">Search tasks</label>
        <Search size={18} aria-hidden="true" className="search-icon" />
        <input
          id="search"
          type="search"
          placeholder="Search tasks or people"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          autoComplete="off"
        />
        {filters.search && (
          <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => set({ search: '' })}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="chips" role="group" aria-label="Status filter">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            className="chip"
            aria-pressed={filters.status === s.value}
            onClick={() => set({ status: s.value })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="filter-row">
        <label className="field">
          <span>Area</span>
          <select value={filters.area} onChange={(e) => set({ area: e.target.value })}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Assignee</span>
          <select value={filters.assignee} onChange={(e) => set({ assignee: e.target.value })}>
            <option value="">Everyone</option>
            <option value={UNASSIGNED}>Unassigned</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="btn btn-ghost" onClick={onExpandAll}>Expand all</button>
        <button type="button" className="btn btn-ghost" onClick={onCollapseAll}>Collapse all</button>
      </div>
    </section>
  );
}
