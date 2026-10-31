import { useState } from 'react';
import { sendMagicLink } from '../lib/supabase';

export function SignIn({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setState('error');
      return setMsg('Enter a valid email address.');
    }
    setState('sending');
    try {
      await sendMagicLink(email.trim());
      setState('sent');
      setMsg('Check your email for a sign-in link.');
    } catch (err) {
      setState('error');
      setMsg((err as Error).message || 'Could not send the link.');
    }
  };

  return (
    <section className="card sign-in" aria-labelledby="signin-h">
      <h2 id="signin-h" className="section-title">Owner sign in</h2>
      <p className="muted">Only the project owner can edit. Everyone else can view live progress.</p>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <div className="edit-actions">
          <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
        <p role="status" className={`status-msg${state === 'error' ? ' is-err' : ''}`}>{msg}</p>
      </form>
    </section>
  );
}
