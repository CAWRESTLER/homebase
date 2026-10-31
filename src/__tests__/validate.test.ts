import { describe, expect, it } from 'vitest';
import { ImportError, exportJson, parseImportText, validateImport } from '../lib/validate';
import { createSeedData } from '../data/seed';
import { isUuid } from '../lib/id';

describe('validateImport', () => {
  it('round-trips an export', () => {
    const seed = createSeedData();
    seed.tasks[0].done = true;
    seed.tasks[0].completedAt = new Date().toISOString();
    seed.tasks[1].assignee = 'Jacob';
    const res = parseImportText(exportJson(seed));
    expect(res.skipped).toBe(0);
    expect(res.regeneratedIds).toBe(0);
    expect(res.data.tasks).toEqual(seed.tasks);
    expect(res.data.areas.map((a) => a.name)).toEqual(seed.areas.map((a) => a.name));
  });

  it('normalizes priority and defaults invalid values to Normal', () => {
    const res = validateImport({
      tasks: [
        { title: 'a', area: 'X', priority: 'high' },
        { title: 'b', area: 'X', priority: 'URGENT' },
        { title: 'c', area: 'X', priority: 5 },
        { title: 'd', area: 'X', priority: 'Low' },
      ],
    });
    expect(res.data.tasks.map((t) => t.priority)).toEqual(['High', 'Normal', 'Normal', 'Low']);
  });

  it('skips malformed records without crashing', () => {
    const res = validateImport({
      tasks: [null, 42, 'str', [], { title: '' , area: 'X'}, { title: 'ok', area: 'X' }, { title: 7, area: 'X' }, { title: 'no area' }],
    });
    expect(res.imported).toBe(1);
    expect(res.skipped).toBe(7);
    expect(res.warnings.join(' ')).toMatch(/skipped/);
  });

  it('regenerates duplicate and invalid IDs', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const res = validateImport({
      tasks: [
        { id, title: 'a', area: 'X' },
        { id, title: 'b', area: 'X' },
        { id: 'nope', title: 'c', area: 'X' },
      ],
    });
    const ids = res.data.tasks.map((t) => t.id);
    expect(ids[0]).toBe(id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(isUuid)).toBe(true);
    expect(res.regeneratedIds).toBe(2);
  });

  it('coerces strings, assignee, done/completedAt', () => {
    const res = validateImport({
      tasks: [
        { title: '  Paint   wall ', area: ' Kitchen ', assignee: '  ', done: 'yes', completedAt: '2026-01-01' },
        { title: 'x', area: 'Kitchen', assignee: 'Sam', done: true, completedAt: 'garbage' },
        { title: 'y', area: 'Kitchen', done: false, completedAt: '2026-01-01T00:00:00Z' },
      ],
    });
    const [a, b, c] = res.data.tasks;
    expect(a.title).toBe('Paint wall');
    expect(a.area).toBe('Kitchen');
    expect(a.assignee).toBeNull();
    expect(a.done).toBe(false);
    expect(a.completedAt).toBeNull();
    expect(b.assignee).toBe('Sam');
    expect(b.done).toBe(true);
    expect(b.completedAt).toBeNull();
    expect(c.completedAt).toBeNull();
    expect(res.data.areas).toHaveLength(1);
  });

  it('creates areas referenced by tasks and keeps listed areas in order', () => {
    const res = validateImport({ areas: [{ name: 'B', order: 1 }, { name: 'A', order: 0 }, { nope: 1 }], tasks: [{ title: 't', area: 'C' }] });
    expect(res.data.areas.map((a) => a.name)).toEqual(['A', 'B', 'C']);
  });

  it('rejects unusable top-level shapes', () => {
    expect(() => validateImport(null)).toThrow(ImportError);
    expect(() => validateImport({ foo: 1 })).toThrow(ImportError);
    expect(() => validateImport('x')).toThrow(ImportError);
    expect(() => parseImportText('{not json')).toThrow(ImportError);
  });

  it('accepts a bare array of tasks', () => {
    expect(validateImport([{ title: 'a', area: 'X' }]).imported).toBe(1);
  });
});
