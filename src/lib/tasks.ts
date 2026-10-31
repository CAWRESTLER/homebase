import type { AppData, Area, Task } from '../types';

/** Open tasks first, then completed; each group keeps its original `order`. Does not mutate. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order);
}

export type StatusFilter = 'all' | 'open' | 'complete' | 'high';

export interface Filters {
  search: string;
  status: StatusFilter;
  area: string; // '' = all
  assignee: string; // '' = all, '__none__' = unassigned
}

export const UNASSIGNED = '__none__';

export function matches(t: Task, f: Filters): boolean {
  if (f.status === 'open' && t.done) return false;
  if (f.status === 'complete' && !t.done) return false;
  if (f.status === 'high' && t.priority !== 'High') return false;
  if (f.area && t.area !== f.area) return false;
  if (f.assignee === UNASSIGNED && t.assignee) return false;
  if (f.assignee && f.assignee !== UNASSIGNED && (t.assignee ?? '').toLowerCase() !== f.assignee.toLowerCase()) return false;
  const q = f.search.trim().toLowerCase();
  if (q && !`${t.title} ${t.assignee ?? ''} ${t.area}`.toLowerCase().includes(q)) return false;
  return true;
}

export function isFiltering(f: Filters): boolean {
  return f.status !== 'all' || !!f.area || !!f.assignee || !!f.search.trim();
}

export function counts(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { total, done, open: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function assignees(tasks: Task[]): string[] {
  const m = new Map<string, string>();
  for (const t of tasks) if (t.assignee) m.set(t.assignee.toLowerCase(), m.get(t.assignee.toLowerCase()) ?? t.assignee);
  return [...m.values()].sort((a, b) => a.localeCompare(b));
}

export function sortedAreas(areas: Area[]): Area[] {
  return [...areas].sort((a, b) => a.order - b.order);
}

export function nextOrder(data: AppData): number {
  return data.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
}

export function setDone(t: Task, done: boolean, now = new Date().toISOString()): Task {
  return { ...t, done, completedAt: done ? now : null, updatedAt: now };
}
