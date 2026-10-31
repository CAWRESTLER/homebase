import type { AppData, Area, Priority, Task } from '../types';
import { DATA_VERSION } from '../types';
import { newId } from '../lib/id';

interface SeedTask {
  title: string;
  priority?: Priority;
  /** true for cleaning tasks added on top of the original 54. */
  added?: boolean;
}

interface SeedArea {
  name: string;
  tasks: SeedTask[];
}

const H: Priority = 'High';

export const SEED_AREAS: SeedArea[] = [
  {
    name: 'Flood Damage — Downstairs',
    tasks: [
      { title: 'Cut out all flood-damaged drywall downstairs', priority: H },
      { title: 'Clean and treat flood-affected wood behind the drywall' },
      { title: 'Allow framing to dry completely and verify moisture levels', priority: H },
      { title: 'Install a new front door downstairs' },
      { title: 'Clean the downstairs', added: true },
    ],
  },
  {
    name: 'Garage — Flood Cleanup & Organization',
    tasks: [
      { title: 'Cut out all flood-damaged drywall in the garage', priority: H },
      { title: 'Clean and treat flood-affected wood behind garage drywall' },
      { title: 'Allow garage framing to dry and verify moisture levels', priority: H },
      { title: 'Fix the side garage door frame' },
      { title: 'Throw away damaged or unnecessary items in the garage' },
      { title: 'Get everything off the garage floor' },
      { title: 'Bring items that belong inside the house in from the garage' },
      { title: 'Organize the entire garage' },
      { title: 'Clean the garage', added: true },
    ],
  },
  {
    name: 'Master Bedroom',
    tasks: [
      { title: 'Fix the leaking pipe in the master bedroom', priority: H },
      { title: 'Cut out additional damaged subfloor' },
      { title: 'Replace the master bedroom windows' },
      { title: 'Install new subfloor in the master bedroom' },
      { title: 'Install new drywall in the master bedroom' },
      { title: 'Finish, prime, and paint new drywall in the master bedroom' },
      { title: 'Install flooring in the master bedroom' },
      { title: 'Clean up the master bedroom' },
    ],
  },
  {
    name: 'Master Bathroom',
    tasks: [
      { title: 'Get the toilet and sink plumbing fixed', priority: H },
      { title: 'Repair drywall in the master bathroom' },
      { title: 'Finish and paint repaired drywall' },
      { title: 'Clean up the master bathroom' },
    ],
  },
  {
    name: 'Upstairs — Drywall & Painting',
    tasks: [
      { title: 'Install metal drywall edge trim upstairs' },
      { title: 'Apply second coat of drywall compound upstairs' },
      { title: 'Apply third finishing coat of drywall compound upstairs' },
      { title: 'Finish drywall work and sand smooth upstairs' },
      { title: 'Prime the drywall upstairs' },
      { title: 'Paint the drywall upstairs' },
      { title: 'Clean up drywall dust and paint supplies upstairs', added: true },
    ],
  },
  {
    name: 'Upstairs — Flooring',
    tasks: [
      { title: 'Install flooring upstairs' },
      { title: 'Install flooring in the hallway' },
      { title: 'Install upstairs flooring transition pieces' },
      { title: 'Install second-floor transition pieces' },
      { title: 'Clean upstairs after construction' },
      { title: 'Clean the hallway', added: true },
    ],
  },
  {
    name: 'Staircases',
    tasks: [
      { title: 'Clean up the upstairs spiral staircase' },
      { title: 'Install stair flooring and finish all stair treads and risers' },
    ],
  },
  {
    name: 'Guest Bedroom',
    tasks: [
      { title: 'Clean up the guest bedroom' },
      { title: 'Clean and organize the guest bedroom closet' },
    ],
  },
  {
    name: 'Other Bathroom',
    tasks: [
      { title: 'Clean the bathroom' },
      { title: 'Install toilet paper holder' },
      { title: 'Install towel holder' },
      { title: 'Touch up and fix bathroom paint' },
    ],
  },
  {
    name: 'Kitchen & Living Areas',
    tasks: [
      { title: 'Clean the kitchen' },
      { title: 'Get a new couch' },
      { title: 'Fix the highest glass block window in the house' },
      { title: 'Clean the living room', added: true },
    ],
  },
  {
    name: 'Whole House',
    tasks: [
      { title: 'Install baseboards throughout the house' },
      { title: 'Replace all doorknobs' },
      { title: 'Do a final deep clean of the whole house', added: true },
    ],
  },
  {
    name: 'Balcony & Outdoor',
    tasks: [
      { title: 'Cover the Blackstone griddle' },
      { title: 'Clean up the balcony' },
    ],
  },
];

export const ORIGINAL_TITLES: string[] = SEED_AREAS.flatMap((a) =>
  a.tasks.filter((t) => !t.added).map((t) => t.title),
);
export const ADDED_CLEANING_TITLES: string[] = SEED_AREAS.flatMap((a) =>
  a.tasks.filter((t) => t.added).map((t) => t.title),
);

/** Flat, ordered seed rows (used by the app and by scripts/gen-seed-sql.ts). */
export const SEED_ROWS = (() => {
  let order = 0;
  return SEED_AREAS.flatMap((a, ai) =>
    a.tasks.map((t) => ({
      title: t.title,
      area: a.name,
      areaOrder: ai,
      priority: (t.priority ?? 'Normal') as Priority,
      order: order++,
    })),
  );
})();

export function createSeedData(now = new Date().toISOString()): AppData {
  const areas: Area[] = SEED_AREAS.map((a, i) => ({ id: newId(), name: a.name, order: i }));
  const tasks: Task[] = SEED_ROWS.map((r) => ({
    id: newId(),
    title: r.title,
    area: r.area,
    priority: r.priority,
    assignee: null,
    done: false,
    completedAt: null,
    order: r.order,
    createdAt: now,
    updatedAt: now,
  }));
  return { version: DATA_VERSION, areas, tasks };
}
