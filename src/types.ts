export type Priority = 'High' | 'Normal' | 'Low';
export const PRIORITIES: Priority[] = ['High', 'Normal', 'Low'];

export interface Task {
  id: string;
  title: string;
  area: string;
  priority: Priority;
  assignee: string | null;
  done: boolean;
  completedAt: string | null;
  /** Original position; never changes when a task is completed, so un-checking restores its place. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  name: string;
  order: number;
}

export interface AppData {
  version: number;
  areas: Area[];
  tasks: Task[];
}

export const DATA_VERSION = 2;
