import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { api } from '../api';
import { StatusPill } from '../components/StatusPill';
import { Logo } from '../components/Logo';
import { useApp } from '../context/AppContext';
import { money, points, prettyDate, prettyMonth } from '../lib/format';
import type { Attendance, FeeStatus, Student } from '../types';

type MyRecord = {
  student: Student;
  month: string;
  currency: string;
  fee: {
    month: string;
    amount: number;
    status: FeeStatus;
    paidDate: string | null;
    recorded: boolean;
  };
  attendance: {
    present: number;
    late: number;
    total: number;
    recent: Attendance[];
  };
  fees: Array<{
    _id: string;
    month: string;
    amount: number;
    status: FeeStatus;
    paidDate: string | null;
  }>;
  marks: Array<{
    _id: string;
    examTitle: string;
    score: number;
    totalMarks: number;
    date: string;
    percentage: number;
  }>;
};

export function StudentDashboard() {
  const { logout, config } = useApp();
  const navigate = useNavigate();
  const [record, setRecord] = useState<MyRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<MyRecord>('/api/me')
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your record.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (record) document.title = `${record.student.name} · ${config?.className ?? 'Smart Class'}`;
  }, [config?.className, record]);

  function signOut() {
    logout();
    navigate('/');
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="panel max-w-md p-8 text-center">
          <p className="text-sm text-clay">{error}</p>
          <button type="button" className="btn-primary mt-5" onClick={signOut}>
            Back to the entrance
          </button>
        </div>
      </div>
    );
  }

  if (!record || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-2xl">Opening your record…</p>
      </div>
    );
  }

  const paid = record.fee.status === 'Paid';

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="text-xs tracking-wide text-ink/60">{config.className}</p>
            <h1 className="font-display text-3xl leading-none">{record.student.name}</h1>
            <p className="mt-1 text-sm text-ink/70">
              {record.student.studentId} · Grade {record.student.grade}
            </p>
          </div>
        </div>
        <button type="button" className="btn-ghost" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <section className={`panel mt-6 p-6 ${paid ? 'border-leaf/40' : 'border-clay/40'}`}>
        <p className="text-xs font-medium tracking-wide text-ink/60">{prettyMonth(record.fee.month)} fee</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <p className="font-display text-4xl">{money(record.fee.amount, record.currency)}</p>
          <StatusPill value={record.fee.status} />
        </div>
        <p className="mt-3 text-sm text-ink/70">
          {paid
            ? `Paid on ${prettyDate(record.fee.paidDate)}.`
            : `This month is still pending. Pay ${config.teacherName} on ${config.teacherPhone}.`}
        </p>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        <article className="panel p-5">
          <p className="text-xs text-ink/60">Classes this month</p>
          <p className="mt-1 font-display text-3xl">{record.attendance.total}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs text-ink/60">On time</p>
          <p className="mt-1 font-display text-3xl">{record.attendance.present}</p>
        </article>
        <article className="panel p-5">
          <p className="text-xs text-ink/60">Late</p>
          <p className="mt-1 font-display text-3xl">{record.attendance.late}</p>
        </article>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel overflow-hidden">
          <div className="border-b border-mist px-5 py-4">
            <h2 className="font-display text-2xl">Marks</h2>
          </div>
          {record.marks.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink/60">No marks yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink/60">
                <tr>
                  <th className="px-5 py-3 font-medium">Exam</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {record.marks.map((mark) => (
                  <tr key={mark._id} className="border-t border-mist">
                    <td className="px-5 py-3">{mark.examTitle}</td>
                    <td className="px-5 py-3">
                      {points(mark.score)}/{points(mark.totalMarks)} · {points(mark.percentage)}%
                    </td>
                    <td className="px-5 py-3">{prettyDate(mark.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-mist px-5 py-4">
            <h2 className="font-display text-2xl">Recent attendance</h2>
          </div>
          {record.attendance.recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink/60">No attendance yet.</p>
          ) : (
            <ul>
              {record.attendance.recent.map((row) => (
                <li key={row._id} className="flex items-center justify-between border-t border-mist px-5 py-3 text-sm">
                  <span>{prettyDate(row.date)}</span>
                  <StatusPill value={row.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {record.fees.length > 0 ? (
        <section className="panel mt-4 overflow-hidden">
          <div className="border-b border-mist px-5 py-4">
            <h2 className="font-display text-2xl">Fee history</h2>
          </div>
          <ul>
            {record.fees.map((fee) => (
              <li key={fee._id} className="flex items-center justify-between gap-3 border-t border-mist px-5 py-3 text-sm">
                <span>{prettyMonth(fee.month)}</span>
                <span>{money(fee.amount, record.currency)}</span>
                <StatusPill value={fee.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
