import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Area, Priority, Task } from '../types';
import { DATA_VERSION } from '../types';
import { normalizePriority } from './validate';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** null when env vars are missing → the app runs in browser-only (localStorage) mode. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;

export interface TaskRow {
  id: string;
  title: string;
  area: string;
  priority: Priority;
  assignee: string | null;
  done: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export interface AreaRow {
  id: string;
  name: string;
  sort_order: number;
}

export const rowToTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  area: r.area,
  priority: normalizePriority(r.priority),
  assignee: r.assignee,
  done: r.done,
  completedAt: r.completed_at,
  order: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const taskToRow = (t: Task): TaskRow => ({
  id: t.id,
  title: t.title,
  area: t.area,
  priority: t.priority,
  assignee: t.assignee,
  done: t.done,
  completed_at: t.completedAt,
  sort_order: t.order,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

const areaToRow = (a: Area): AreaRow => ({ id: a.id, name: a.name, sort_order: a.order });

function need(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function fetchAll(): Promise<AppData> {
  const sb = need();
  const [areas, tasks] = await Promise.all([
    sb.from('areas').select('id,name,sort_order').order('sort_order'),
    sb.from('tasks').select('*').order('sort_order'),
  ]);
  return {
    version: DATA_VERSION,
    areas: (check(areas) as AreaRow[]).map((r) => ({ id: r.id, name: r.name, order: r.sort_order })),
    tasks: (check(tasks) as TaskRow[]).map(rowToTask),
  };
}

export async function checkIsEditor(): Promise<boolean> {
  const sb = need();
  const { data, error } = await sb.rpc('is_editor');
  if (error) return false;
  return data === true;
}

export async function remoteInsertTask(t: Task) {
  // updated_at / created_at are set by the database.
  const { created_at: _c, updated_at: _u, ...row } = taskToRow(t);
  void _c;
  void _u;
  check(await need().from('tasks').insert(row));
}

export async function remoteUpdateTask(t: Task) {
  const { id, created_at: _c, updated_at: _u, ...row } = taskToRow(t);
  void _c;
  void _u;
  check(await need().from('tasks').update(row).eq('id', id));
}

export async function remoteDeleteTask(id: string) {
  check(await need().from('tasks').delete().eq('id', id));
}

export async function remoteInsertArea(a: Area) {
  check(await need().from('areas').insert(areaToRow(a)));
}

/** tasks.area references areas(name) ON UPDATE CASCADE, so tasks follow automatically. */
export async function remoteRenameArea(oldName: string, newName: string) {
  check(await need().from('areas').update({ name: newName }).eq('name', oldName));
}

/** Atomic overwrite via SQL function (see supabase/migrations/0001_init.sql). */
export async function remoteReplaceAll(data: AppData) {
  check(
    await need().rpc('replace_all', {
      p_areas: data.areas.map(areaToRow),
      p_tasks: data.tasks.map(taskToRow),
    }),
  );
}

export async function sendMagicLink(email: string) {
  const { error } = await need().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: false },
  });
  if (error) throw new Error(error.message);
}
