import { useState } from 'react';
import { signInOwner } from '../lib/supabase';

export function SignIn({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setMsg('Enter the password.');
    setBusy(true);
    setMsg('');
    try {
      await signInOwner(password);
      setPassword('');
    } catch (err) {
      setMsg((err as Error).message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card sign-in" aria-labelledby="signin-h">
      <h2 id="signin-h" className="section-title">Owner sign in</h2>
      <p className="muted">Only the project owner can edit. Everyone else can view live progress.</p>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={msg ? true : undefined}
            autoFocus
            required
          />
        </label>
        <div className="edit-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
        <p role="status" className={`status-msg${msg ? ' is-err' : ''}`}>{msg}</p>
      </form>
    </section>
  );
}
