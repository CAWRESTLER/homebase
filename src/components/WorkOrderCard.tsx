import { ListOrdered } from 'lucide-react';

const STEPS = [
  'Stop active leaks first (master bedroom pipe, toilet and sink plumbing).',
  'Remove flood-damaged materials, clean and treat wood, let framing dry, and verify moisture levels.',
  'Close up the shell: windows, doors, and subfloor.',
  'Drywall: hang, tape, finish coats, sand, prime, and paint.',
  'Floors, stairs, and transition pieces.',
  'Baseboards, doorknobs, and bathroom accessories.',
  'Final cleaning, garage organization, and furnishing.',
];

export function WorkOrderCard() {
  return (
    <details className="card work-order">
      <summary>
        <ListOrdered size={20} aria-hidden="true" />
        <span>Recommended work order</span>
      </summary>
      <ol>
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </details>
  );
}
