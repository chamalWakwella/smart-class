import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const { loginAdmin, config, role } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!config?.authRequired || role === 'admin') return <Navigate to="/admin" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loginAdmin(password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="panel w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-4 font-display text-4xl text-ink">Teacher sign in</h1>
        <p className="mt-2 text-sm text-ink/70">
          {config?.teacherName ? `${config.teacherName} · ` : ''}
          Grades 9, 10 and 11. This opens the admin dashboard.
        </p>
        <label className="mt-6 block">
          <span className="label">Password</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
        <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
          {busy ? 'Checking…' : 'Open admin dashboard'}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-ink/60 hover:text-ink">
          Back to the entrance
        </Link>
      </form>
    </div>
  );
}
