import { counts } from '../lib/tasks';
import type { Task } from '../types';
import { ProgressBar } from './ProgressBar';

export function Summary({ tasks }: { tasks: Task[] }) {
  const c = counts(tasks);
  return (
    <section className="card summary" aria-labelledby="summary-h">
      <h2 id="summary-h" className="visually-hidden">Overall progress</h2>
      <dl className="stats">
        <div><dt>Total</dt><dd>{c.total}</dd></div>
        <div><dt>Open</dt><dd>{c.open}</dd></div>
        <div><dt>Done</dt><dd>{c.done}</dd></div>
      </dl>
      <ProgressBar value={c.done} max={c.total} label="Overall progress" large />
    </section>
  );
}
