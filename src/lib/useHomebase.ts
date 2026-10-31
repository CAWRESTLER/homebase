import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, Area, Priority, Task } from '../types';
import { DATA_VERSION } from '../types';
import { createSeedData } from '../data/seed';
import { loadLocal, saveLocal } from './storage';
import { newId } from './id';
import { nextOrder, setDone } from './tasks';
import * as remote from './supabase';

export type Mode = 'local' | 'cloud';

export interface NewTask {
  title: string;
  area: string;
  priority: Priority;
  assignee: string | null;
}

const EMPTY: AppData = { version: DATA_VERSION, areas: [], tasks: [] };

export function useHomebase() {
  const sb = remote.supabase;
  const mode: Mode = sb ? 'cloud' : 'local';
  const [data, setDataState] = useState<AppData>(() => (mode === 'local' ? loadLocal() : EMPTY));
  const dataRef = useRef(data);
  const setData = useCallback((d: AppData) => {
    dataRef.current = d;
    setDataState(d);
  }, []);
  const [loading, setLoading] = useState(mode === 'cloud');
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isEditor, setIsEditor] = useState(false);
  const pending = useRef(0);
  const refreshQueued = useRef(false);

  // ---- local persistence
  useEffect(() => {
    if (mode !== 'local') return;
    setSaveFailed(!saveLocal(data));
  }, [data, mode]);

  // ---- cloud: load + realtime
  const refresh = useCallback(async () => {
    if (!sb) return;
    if (pending.current > 0) {
      refreshQueued.current = true;
      return;
    }
    try {
      const d = await remote.fetchAll();
      if (pending.current === 0) setData(d);
      setError(null);
    } catch (e) {
      setError(`Couldn't load live data: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [sb, setData]);

  useEffect(() => {
    if (!sb) return;
    void refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    };
    const channel = sb
      .channel('homebase-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, onChange)
      .subscribe();
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void sb.removeChannel(channel);
    };
  }, [sb, refresh]);

  // ---- cloud: auth
  useEffect(() => {
    if (!sb) return;
    void sb.auth.getSession().then(({ data: s }) => setSession(s.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!sb || !session) {
      setIsEditor(false);
      return;
    }
    let alive = true;
    void remote.checkIsEditor().then((ok) => alive && setIsEditor(ok));
    return () => {
      alive = false;
    };
  }, [sb, session]);

  const canEdit = mode === 'local' || isEditor;

  /** Optimistic update: apply locally now, push to the server, roll back on failure. */
  const apply = useCallback(
    (next: AppData, push?: () => Promise<void>) => {
      const prev = dataRef.current;
      setData(next);
      if (mode !== 'cloud' || !push) return;
      pending.current++;
      push()
        .then(() => setError(null))
        .catch((e: Error) => {
          setData(prev);
          setError(`Change not saved (rolled back): ${e.message}`);
        })
        .finally(() => {
          pending.current--;
          if (pending.current === 0 && refreshQueued.current) {
            refreshQueued.current = false;
            void refresh();
          }
        });
    },
    [mode, refresh, setData],
  );

  const patchTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const d = dataRef.current;
      const cur = d.tasks.find((t) => t.id === id);
      if (!cur) return;
      const now = new Date().toISOString();
      let updated: Task = { ...cur, ...patch, updatedAt: now };
      if (patch.done !== undefined && patch.done !== cur.done) updated = setDone(updated, patch.done, now);
      apply({ ...d, tasks: d.tasks.map((t) => (t.id === id ? updated : t)) }, () => remote.remoteUpdateTask(updated));
    },
    [apply],
  );

  const ensureArea = (d: AppData, name: string): { data: AppData; created: Area | null } => {
    if (d.areas.some((a) => a.name === name)) return { data: d, created: null };
    const a: Area = { id: newId(), name, order: d.areas.reduce((m, x) => Math.max(m, x.order), -1) + 1 };
    return { data: { ...d, areas: [...d.areas, a] }, created: a };
  };

  const actions = {
    toggle: (id: string) => {
      const t = dataRef.current.tasks.find((x) => x.id === id);
      if (t) patchTask(id, { done: !t.done });
    },
    updateTask: patchTask,
    addTask: (n: NewTask) => {
      const now = new Date().toISOString();
      const { data: d, created } = ensureArea(dataRef.current, n.area);
      const t: Task = {
        id: newId(),
        title: n.title,
        area: n.area,
        priority: n.priority,
        assignee: n.assignee,
        done: false,
        completedAt: null,
        order: nextOrder(d),
        createdAt: now,
        updatedAt: now,
      };
      apply({ ...d, tasks: [...d.tasks, t] }, async () => {
        if (created) await remote.remoteInsertArea(created);
        await remote.remoteInsertTask(t);
      });
    },
    deleteTask: (id: string) => {
      const d = dataRef.current;
      apply({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }, () => remote.remoteDeleteTask(id));
    },
    addArea: (name: string): boolean => {
      const { data: d, created } = ensureArea(dataRef.current, name);
      if (!created) return false;
      apply(d, () => remote.remoteInsertArea(created));
      return true;
    },
    renameArea: (oldName: string, newName: string): boolean => {
      const d = dataRef.current;
      if (oldName === newName) return true;
      if (d.areas.some((a) => a.name.toLowerCase() === newName.toLowerCase() && a.name !== oldName)) return false;
      apply(
        {
          ...d,
          areas: d.areas.map((a) => (a.name === oldName ? { ...a, name: newName } : a)),
          tasks: d.tasks.map((t) => (t.area === oldName ? { ...t, area: newName } : t)),
        },
        () => remote.remoteRenameArea(oldName, newName),
      );
      return true;
    },
    replaceAll: (next: AppData) => apply(next, () => remote.remoteReplaceAll(next)),
    resetToSeed: () => {
      const seed = createSeedData();
      apply(seed, () => remote.remoteReplaceAll(seed));
    },
    signOut: () => void sb?.auth.signOut(),
    dismissError: () => setError(null),
  };

  return { mode, data, loading, error, saveFailed, session, isEditor, canEdit, actions };
}
