import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useApp } from '../context/AppContext';

export function StudentLoginPage() {
  const { loginStudent, config, role } = useApp();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (role === 'student') return <Navigate to="/student" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loginStudent(studentId.trim().toUpperCase(), guardianPhone.trim());
      navigate('/student', { replace: true });
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
        <h1 className="mt-4 font-display text-4xl text-ink">Student sign in</h1>
        <p className="mt-2 text-sm text-ink/70">
          {config?.className}. Use the student ID on your card and the guardian phone saved with the class.
        </p>
        <label className="mt-6 block">
          <span className="label">Student ID</span>
          <input
            className="field uppercase"
            autoComplete="username"
            placeholder="MATH-9-001"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block">
          <span className="label">Guardian phone</span>
          <input
            className="field"
            type="tel"
            autoComplete="tel"
            placeholder="0771000101"
            value={guardianPhone}
            onChange={(event) => setGuardianPhone(event.target.value)}
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
        <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
          {busy ? 'Checking…' : 'Open my dashboard'}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-ink/60 hover:text-ink">
          Back to the entrance
        </Link>
      </form>
    </div>
  );
}
