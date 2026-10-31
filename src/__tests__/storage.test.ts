import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadLocal, migrate, saveLocal } from '../lib/storage';
import { DATA_VERSION } from '../types';
import { SEED_ROWS } from '../data/seed';

function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe('storage', () => {
  it('uses the expected key', () => expect(STORAGE_KEY).toBe('home-renovation-tasks-v1'));

  it('seeds when empty', () => {
    const d = loadLocal(memStore());
    expect(d.tasks).toHaveLength(SEED_ROWS.length);
    expect(d.version).toBe(DATA_VERSION);
  });

  it('round-trips save/load', () => {
    const s = memStore();
    const d = loadLocal(s);
    d.tasks[3] = { ...d.tasks[3], done: true, completedAt: '2026-10-31T12:00:00.000Z' };
    expect(saveLocal(d, s)).toBe(true);
    const again = loadLocal(s);
    expect(again.tasks[3].done).toBe(true);
    expect(again.tasks).toEqual(d.tasks);
  });

  it('migrates v0 (bare array, legacy fields)', () => {
    const d = migrate([
      { id: 1, text: 'Old task', category: 'Kitchen', completed: true },
      { id: 1, text: 'Other', category: 'Kitchen' },
    ])!;
    expect(d.version).toBe(DATA_VERSION);
    expect(d.tasks.map((t) => t.title)).toEqual(['Old task', 'Other']);
    expect(d.tasks[0].done).toBe(true);
    expect(d.tasks[0].assignee).toBeNull();
    expect(d.areas.map((a) => a.name)).toEqual(['Kitchen']);
    expect(new Set(d.tasks.map((t) => t.id)).size).toBe(2);
  });

  it('migrates v1 (no areas list, no assignee)', () => {
    const d = migrate({ version: 1, tasks: [{ id: 'a', title: 'T', area: 'Garage', priority: 'High', done: false, order: 5 }] })!;
    expect(d.version).toBe(DATA_VERSION);
    expect(d.areas[0].name).toBe('Garage');
    expect(d.tasks[0]).toMatchObject({ title: 'T', priority: 'High', assignee: null, order: 0 });
  });

  it('falls back to seed on corrupt JSON and keeps a backup', () => {
    const s = memStore({ [STORAGE_KEY]: '{broken' });
    const d = loadLocal(s);
    expect(d.tasks).toHaveLength(SEED_ROWS.length);
    expect(s.m.get(`${STORAGE_KEY}-corrupt-backup`)).toBe('{broken');
  });

  it('returns false when storage throws', () => {
    const s = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    expect(saveLocal(loadLocal(s), s)).toBe(false);
  });
});
