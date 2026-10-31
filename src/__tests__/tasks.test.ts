import { describe, expect, it } from 'vitest';
import { assignees, counts, matches, setDone, sortTasks, UNASSIGNED, type Filters } from '../lib/tasks';
import type { Task } from '../types';

const mk = (order: number, done = false, extra: Partial<Task> = {}): Task => ({
  id: `id${order}`, title: `Task ${order}`, area: 'A', priority: 'Normal', assignee: null, done,
  completedAt: done ? '2026-01-01T00:00:00.000Z' : null, order, createdAt: '', updatedAt: '', ...extra,
});

const F: Filters = { search: '', status: 'all', area: '', assignee: '' };

describe('sortTasks', () => {
  it('puts open before completed, preserving original order in each group', () => {
    const tasks = [mk(0, true), mk(1), mk(2, true), mk(3), mk(4)];
    expect(sortTasks(tasks).map((t) => t.order)).toEqual([1, 3, 4, 0, 2]);
  });
  it('restores original position when un-completed', () => {
    const tasks = [mk(0), mk(1, true), mk(2)];
    const reopened = tasks.map((t) => (t.order === 1 ? setDone(t, false) : t));
    expect(sortTasks(reopened).map((t) => t.order)).toEqual([0, 1, 2]);
  });
  it('does not mutate input', () => {
    const tasks = [mk(1, true), mk(0)];
    sortTasks(tasks);
    expect(tasks.map((t) => t.order)).toEqual([1, 0]);
  });
});

describe('setDone', () => {
  it('sets and clears completedAt', () => {
    const d = setDone(mk(0), true, '2026-10-31T00:00:00.000Z');
    expect(d.completedAt).toBe('2026-10-31T00:00:00.000Z');
    expect(setDone(d, false).completedAt).toBeNull();
  });
});

describe('filters', () => {
  const ts = [mk(0, false, { priority: 'High', assignee: 'Jacob' }), mk(1, true, { area: 'B', assignee: 'sam' }), mk(2)];
  it('status', () => {
    expect(ts.filter((t) => matches(t, { ...F, status: 'open' }))).toHaveLength(2);
    expect(ts.filter((t) => matches(t, { ...F, status: 'complete' }))).toHaveLength(1);
    expect(ts.filter((t) => matches(t, { ...F, status: 'high' }))).toHaveLength(1);
  });
  it('area, assignee, unassigned, search', () => {
    expect(ts.filter((t) => matches(t, { ...F, area: 'B' }))).toHaveLength(1);
    expect(ts.filter((t) => matches(t, { ...F, assignee: 'Sam' }))).toHaveLength(1);
    expect(ts.filter((t) => matches(t, { ...F, assignee: UNASSIGNED }))).toHaveLength(1);
    expect(ts.filter((t) => matches(t, { ...F, search: 'jacob' }))).toHaveLength(1);
    expect(ts.filter((t) => matches(t, { ...F, search: 'task 2' }))).toHaveLength(1);
  });
  it('counts and assignees', () => {
    expect(counts(ts)).toEqual({ total: 3, done: 1, open: 2, pct: 33 });
    expect(assignees([...ts, mk(3, false, { assignee: 'JACOB' })])).toEqual(['Jacob', 'sam']);
  });
});
