import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ScanLine } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { money } from '../lib/format';

export function PortalPage() {
  const { config, role, logout, clearExit } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    clearExit();
    if (config) document.title = config.className;
  }, [clearExit, config]);
  if (!config) return null;

  function openTeacher() {
    if (role === 'student') logout();
    if (config?.authRequired && role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    navigate('/admin');
  }

  function openStudent() {
    if (role === 'student') {
      navigate('/student');
      return;
    }
    navigate('/student/login');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Logo />
        <div>
          <p className="font-display text-3xl leading-none text-ink">{config.className}</p>
          <p className="mt-1 text-sm text-ink/70">
            {config.teacherName} · {config.teacherPhone} · Grades 9, 10 and 11
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <button type="button" className="panel p-6 text-left transition hover:-translate-y-0.5" onClick={openTeacher}>
          <ScanLine className="h-6 w-6 text-gold" />
          <h1 className="mt-4 font-display text-3xl">Teacher</h1>
          <p className="mt-2 text-sm text-ink/70">
            Scan attendance, keep the register, record {money(config.defaultMonthlyFee, config.currency)} fees, and enter marks.
          </p>
          <span className="btn-primary mt-5">{role === 'admin' || !config.authRequired ? 'Open admin dashboard' : 'Sign in as teacher'}</span>
        </button>
        <button type="button" className="panel p-6 text-left transition hover:-translate-y-0.5" onClick={openStudent}>
          <GraduationCap className="h-6 w-6 text-gold" />
          <h1 className="mt-4 font-display text-3xl">Student</h1>
          <p className="mt-2 text-sm text-ink/70">
            See this month’s fee, attendance, marks, and your smart card. Sign in with your student ID and guardian phone.
          </p>
          <span className="btn-primary mt-5">{role === 'student' ? 'Open my dashboard' : 'Sign in as student'}</span>
        </button>
      </div>
    </div>
  );
}
