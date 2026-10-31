import type { AppData } from '../types';
import { DATA_VERSION } from '../types';
import { createSeedData } from '../data/seed';
import { validateImport } from './validate';

export const STORAGE_KEY = 'home-renovation-tasks-v1';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): KV | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Migrates any previously stored shape to the current version.
 *  - v0: a bare array of tasks (legacy prototype; fields like text/completed)
 *  - v1: { version: 1, tasks } with no areas list and no assignee field
 *  - v2: current ({ version: 2, areas, tasks })
 * Returns null if nothing usable is found.
 */
export function migrate(raw: unknown): AppData | null {
  try {
    const res = validateImport(raw);
    if (res.data.tasks.length === 0 && res.data.areas.length === 0) return null;
    return { ...res.data, version: DATA_VERSION };
  } catch {
    return null;
  }
}

export function loadLocal(store: KV | null = defaultStore()): AppData {
  if (!store) return createSeedData();
  let text: string | null = null;
  try {
    text = store.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (text) {
    try {
      const migrated = migrate(JSON.parse(text));
      if (migrated) return migrated;
    } catch {
      /* corrupt JSON — fall through to seed, but keep a backup copy */
      try {
        store.setItem(`${STORAGE_KEY}-corrupt-backup`, text);
      } catch {
        /* ignore */
      }
    }
  }
  return createSeedData();
}

export function saveLocal(data: AppData, store: KV | null = defaultStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: DATA_VERSION }));
    return true;
  } catch {
    return false;
  }
}
