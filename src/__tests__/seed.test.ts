import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADDED_CLEANING_TITLES, ORIGINAL_TITLES, SEED_AREAS, SEED_ROWS, createSeedData } from '../data/seed';

// Verbatim copy of every original task title from the project brief.
const ORIGINALS = `Cut out all flood-damaged drywall downstairs
Clean and treat flood-affected wood behind the drywall
Allow framing to dry completely and verify moisture levels
Install a new front door downstairs
Cut out all flood-damaged drywall in the garage
Clean and treat flood-affected wood behind garage drywall
Allow garage framing to dry and verify moisture levels
Fix the side garage door frame
Throw away damaged or unnecessary items in the garage
Get everything off the garage floor
Bring items that belong inside the house in from the garage
Organize the entire garage
Fix the leaking pipe in the master bedroom
Cut out additional damaged subfloor
Replace the master bedroom windows
Install new subfloor in the master bedroom
Install new drywall in the master bedroom
Finish, prime, and paint new drywall in the master bedroom
Install flooring in the master bedroom
Clean up the master bedroom
Get the toilet and sink plumbing fixed
Repair drywall in the master bathroom
Finish and paint repaired drywall
Clean up the master bathroom
Install metal drywall edge trim upstairs
Apply second coat of drywall compound upstairs
Apply third finishing coat of drywall compound upstairs
Finish drywall work and sand smooth upstairs
Prime the drywall upstairs
Paint the drywall upstairs
Install flooring upstairs
Install flooring in the hallway
Install upstairs flooring transition pieces
Install second-floor transition pieces
Clean upstairs after construction
Clean up the upstairs spiral staircase
Install stair flooring and finish all stair treads and risers
Clean up the guest bedroom
Clean and organize the guest bedroom closet
Clean the bathroom
Install toilet paper holder
Install towel holder
Touch up and fix bathroom paint
Clean the kitchen
Get a new couch
Fix the highest glass block window in the house
Install baseboards throughout the house
Replace all doorknobs
Cover the Blackstone griddle
Clean up the balcony`.split('\n');

describe('seed data', () => {
  it('contains every original title verbatim, in order', () => {
    expect(ORIGINAL_TITLES).toEqual(ORIGINALS);
    // NOTE: the brief says "54 tasks" but its list contains exactly 50 titles.
    expect(ORIGINAL_TITLES).toHaveLength(50);
  });

  it('every area has at least one cleaning task', () => {
    for (const a of SEED_AREAS) expect(a.tasks.some((t) => /\bclean/i.test(t.title)), a.name).toBe(true);
  });

  it('total = originals + added cleaning tasks, no duplicates', () => {
    expect(SEED_ROWS).toHaveLength(ORIGINAL_TITLES.length + ADDED_CLEANING_TITLES.length);
    expect(new Set(SEED_ROWS.map((r) => r.title)).size).toBe(SEED_ROWS.length);
  });

  it('marks urgent items High and the rest Normal', () => {
    const high = SEED_ROWS.filter((r) => r.priority === 'High').map((r) => r.title);
    expect(high).toEqual([
      'Cut out all flood-damaged drywall downstairs',
      'Allow framing to dry completely and verify moisture levels',
      'Cut out all flood-damaged drywall in the garage',
      'Allow garage framing to dry and verify moisture levels',
      'Fix the leaking pipe in the master bedroom',
      'Get the toilet and sink plumbing fixed',
    ]);
  });

  it('createSeedData builds unique ids and sequential order', () => {
    const d = createSeedData();
    expect(new Set(d.tasks.map((t) => t.id)).size).toBe(d.tasks.length);
    expect(d.tasks.map((t) => t.order)).toEqual(d.tasks.map((_, i) => i));
  });

  it('supabase/seed.sql is in sync with seed.ts', () => {
    const sql = readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8');
    for (const r of SEED_ROWS) expect(sql).toContain(`'${r.title.replace(/'/g, "''")}'`);
    expect(sql.match(/^  \(E?'/gm)?.length).toBe(SEED_AREAS.length + SEED_ROWS.length);
  });
});

describe('supabase sql files', () => {
  it('are pure ASCII so pasting into the SQL editor cannot cause mojibake', () => {
    for (const f of ['supabase/seed.sql', 'supabase/migrations/0001_init.sql']) {
      const text = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
      expect([...text].filter((c) => c.charCodeAt(0) > 127), f).toEqual([]);
    }
  });
});
