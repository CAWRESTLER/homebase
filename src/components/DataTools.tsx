import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw } from 'lucide-react';
import type { AppData } from '../types';
import { exportJson, ImportError, parseImportText } from '../lib/validate';

interface Props {
  data: AppData;
  canEdit: boolean;
  onReplace: (d: AppData) => void;
  onReset: () => void;
}

export function DataTools({ data, canEdit, onReplace, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const doExport = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `homebase-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus({ kind: 'ok', text: `Exported ${data.tasks.length} tasks.` });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new ImportError('File is too large (max 5 MB).');
      const res = parseImportText(await file.text());
      if (res.imported === 0) throw new ImportError('No valid tasks found in that file.');
      const ok = window.confirm(
        `Import ${res.imported} tasks in ${res.data.areas.length} areas? This will REPLACE all current tasks.` +
          (res.warnings.length ? `\n\n${res.warnings.join('\n')}` : ''),
      );
      if (!ok) return setStatus(null);
      onReplace(res.data);
      setStatus({ kind: 'ok', text: `Imported ${res.imported} tasks. ${res.warnings.join(' ')}`.trim() });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof ImportError ? err.message : "Couldn't read that file." });
    }
  };

  const reset = () => {
    if (window.confirm('Reset to the original task list? All current tasks and progress will be replaced.')) {
      onReset();
      setStatus({ kind: 'ok', text: 'Reset to the original task list.' });
    }
  };

  return (
    <section className="card data-tools" aria-labelledby="data-h">
      <h2 id="data-h" className="section-title">Backup</h2>
      <div className="data-actions">
        <button type="button" className="btn" onClick={doExport}>
          <Download size={18} aria-hidden="true" /> Export JSON
        </button>
        {canEdit && (
          <>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={18} aria-hidden="true" /> Import JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} data-testid="import-input" aria-label="Import JSON file" />
            <button type="button" className="btn btn-danger" onClick={reset}>
              <RotateCcw size={18} aria-hidden="true" /> Reset
            </button>
          </>
        )}
      </div>
      <p role="status" className={`status-msg${status?.kind === 'err' ? ' is-err' : ''}`}>{status?.text ?? ''}</p>
    </section>
  );
}
