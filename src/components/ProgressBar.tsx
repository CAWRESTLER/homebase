export function ProgressBar({ value, max, label, large }: { value: number; max: number; label: string; large?: boolean }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className={`progress${large ? ' progress-lg' : ''}`}>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}% (${value} of ${max} done)`}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-text">{pct}%</span>
    </div>
  );
}
