import type { AppData, Area, Priority, Task } from '../types';
import { DATA_VERSION, PRIORITIES } from '../types';
import { isUuid, newId } from './id';

export interface ImportResult {
  data: AppData;
  imported: number;
  skipped: number;
  regeneratedIds: number;
  warnings: string[];
}

export class ImportError extends Error {}

const MAX_TITLE = 300;
const MAX_NAME = 120;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cleanStr(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}

export function normalizePriority(v: unknown): Priority {
  if (typeof v === 'string') {
    const hit = PRIORITIES.find((p) => p.toLowerCase() === v.trim().toLowerCase());
    if (hit) return hit;
  }
  return 'Normal';
}

function validDate(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Validates untrusted JSON (from an import file or old localStorage) into AppData.
 * Never throws for malformed records — they are skipped. Throws ImportError only when the
 * top-level shape is unusable (not an object/array, or no tasks list at all).
 * Accepts { tasks, areas? } objects or a bare array of tasks. Legacy field names
 * (text/name for title, completed for done, category/group for area) are understood.
 */
export function validateImport(raw: unknown, now = new Date().toISOString()): ImportResult {
  let rawTasks: unknown[];
  let rawAreas: unknown[] = [];
  if (Array.isArray(raw)) rawTasks = raw;
  else if (isObj(raw) && Array.isArray(raw.tasks)) {
    rawTasks = raw.tasks;
    if (Array.isArray(raw.areas)) rawAreas = raw.areas;
  } else {
    throw new ImportError('File is not a Homebase export (expected an object with a "tasks" list).');
  }

  const warnings: string[] = [];
  const areas: Area[] = [];
  const areaByKey = new Map<string, Area>();
  const usedAreaIds = new Set<string>();
  const addArea = (name: string, id?: unknown): Area => {
    const key = name.toLowerCase();
    const existing = areaByKey.get(key);
    if (existing) return existing;
    let aid = isUuid(id) && !usedAreaIds.has(id) ? id : newId();
    usedAreaIds.add(aid);
    const a: Area = { id: aid, name, order: areas.length };
    areas.push(a);
    areaByKey.set(key, a);
    return a;
  };

  let skipped = 0;
  rawAreas
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const ox = isObj(x.a) && typeof x.a.order === 'number' ? x.a.order : x.i;
      const oy = isObj(y.a) && typeof y.a.order === 'number' ? y.a.order : y.i;
      return ox - oy;
    })
    .forEach(({ a }) => {
      const name = isObj(a) ? cleanStr(a.name, MAX_NAME) : cleanStr(a, MAX_NAME);
      if (!name) {
        skipped++;
        return;
      }
      addArea(name, isObj(a) ? a.id : undefined);
    });

  const seenIds = new Set<string>();
  let regeneratedIds = 0;
  const tasks: Task[] = [];
  rawTasks.forEach((t, i) => {
    if (!isObj(t)) {
      skipped++;
      return;
    }
    const title = cleanStr(t.title ?? t.text ?? t.name, MAX_TITLE);
    const areaName = cleanStr(t.area ?? t.category ?? t.group, MAX_NAME);
    if (!title || !areaName) {
      skipped++;
      return;
    }
    const area = addArea(areaName);
    let id = t.id;
    if (!isUuid(id) || seenIds.has(id)) {
      id = newId();
      regeneratedIds++;
    }
    seenIds.add(id as string);
    const done = t.done === true || t.completed === true;
    const order =
      typeof t.order === 'number' && Number.isFinite(t.order) ? t.order : typeof t.sort_order === 'number' ? t.sort_order : i;
    const createdAt = validDate(t.createdAt ?? t.created_at) ?? now;
    tasks.push({
      id: id as string,
      title,
      area: area.name,
      priority: normalizePriority(t.priority),
      assignee: cleanStr(t.assignee, MAX_NAME),
      done,
      completedAt: done ? validDate(t.completedAt ?? t.completed_at) : null,
      order,
      createdAt,
      updatedAt: validDate(t.updatedAt ?? t.updated_at) ?? createdAt,
    });
  });

  // Re-number order densely, preserving relative order.
  tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => a.t.order - b.t.order || a.i - b.i)
    .forEach(({ t }, idx) => (t.order = idx));

  if (skipped) warnings.push(`${skipped} malformed record${skipped === 1 ? ' was' : 's were'} skipped.`);
  if (regeneratedIds) warnings.push(`${regeneratedIds} missing or duplicate ID${regeneratedIds === 1 ? ' was' : 's were'} regenerated.`);

  return {
    data: { version: DATA_VERSION, areas, tasks: tasks.sort((a, b) => a.order - b.order) },
    imported: tasks.length,
    skipped,
    regeneratedIds,
    warnings,
  };
}

/** Parse JSON text safely. */
export function parseImportText(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }
  return validateImport(raw);
}

export function exportJson(data: AppData): string {
  return JSON.stringify(
    { app: 'homebase', version: DATA_VERSION, exportedAt: new Date().toISOString(), areas: data.areas, tasks: data.tasks },
    null,
    2,
  );
}
