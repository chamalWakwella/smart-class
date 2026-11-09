import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';
import { Banner, Stat } from '../components/Feedback';
import { GradeFilter } from '../components/GradeFilter';
import { PageHeader } from '../components/PageHeader';
import { GradeBadge, StatusPill } from '../components/StatusPill';
import { useConfig } from '../context/AppContext';
import { currentMonthValue, money, prettyDate, prettyMonth } from '../lib/format';
import type { FeeDashboard, FeeRow, FeeStatus } from '../types';

export function FeesPage() {
  const config = useConfig();
  const [grade, setGrade] = useState('');
  const [month, setMonth] = useState(currentMonthValue);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [billAmount, setBillAmount] = useState(String(config.defaultMonthlyFee));
  const [data, setData] = useState<FeeDashboard | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ month });
      if (grade) params.set('grade', grade);
      if (status) params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      setLoading(true);
      api<FeeDashboard>(`/api/fees/dashboard?${params.toString()}`)
        .then((dashboard) => {
          if (cancelled) return;
          setData(dashboard);
          const next: Record<string, string> = {};
          for (const row of dashboard.rows) next[row.student.studentId] = String(row.fee.amount);
          setAmounts(next);
          setError('');
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Fees could not be loaded.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [grade, month, status, query, refreshKey]);

  async function save(row: FeeRow, nextStatus: FeeStatus) {
    const amount = Number(amounts[row.student.studentId]);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid amount.');
      return;
    }
    setBusy(row.student.studentId);
    setError('');
    try {
      if (row.fee._id) {
        await api(`/api/fees/${row.fee._id}`, {
          method: 'PUT',
          body: JSON.stringify({ amount, status: nextStatus }),
        });
      } else {
        await api('/api/fees', {
          method: 'POST',
          body: JSON.stringify({
            studentId: row.student.studentId,
            month,
            amount,
            status: nextStatus,
          }),
        });
      }
      setMessage(`${row.student.name} marked ${nextStatus.toLowerCase()} for ${prettyMonth(month)}.`);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The fee could not be saved.');
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    const amount = Number(billAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter the monthly fee to create.');
      return;
    }
    setBusy('generate');
    setError('');
    try {
      const result = await api<{ created: number }>('/api/fees/generate', {
        method: 'POST',
        body: JSON.stringify({ month, amount, ...(grade ? { grade: Number(grade) } : {}) }),
      });
      setMessage(
        result.created === 0
          ? `Every matching student already has a ${prettyMonth(month)} fee.`
          : `Created ${result.created} pending fee${result.created === 1 ? '' : 's'} for ${prettyMonth(month)}.`,
      );
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fees could not be created.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <PageHeader
        title="Fees"
        lede={`Each student pays ${money(config.defaultMonthlyFee, config.currency)} a month. Filter the sheet, mark a payment, or create pending bills for anyone missing one.`}
      />
      <Banner tone="ok" children={message} />
      <Banner tone="error" children={error} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <GradeFilter value={grade} onChange={setGrade} />
        <label>
          <span className="label">Month</span>
          <input className="field" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <div className="inline-flex rounded-xl border border-mist bg-white p-1" role="group" aria-label="Payment status">
          {[
            ['', 'All'],
            ['Paid', 'Paid'],
            ['Pending', 'Pending'],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={status === value}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === value ? 'bg-board text-white' : 'text-ink/70'}`}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search fees</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
          <input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or ID" />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label>
          <span className="label">New bill amount</span>
          <input className="field w-36" type="number" min="0" step="1" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} />
        </label>
        <button type="button" className="btn-primary" disabled={busy === 'generate'} onClick={() => void generate()}>
          {busy === 'generate' ? 'Creating…' : 'Create pending fees'}
        </button>
        <p className="text-xs text-ink/60">Existing paid or pending rows are left as they are.</p>
      </div>

      {data ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Collected" value={money(data.totals.collected, config.currency)} hint={`${data.totals.paidCount} paid`} />
          <Stat label="Outstanding" value={money(data.totals.outstanding, config.currency)} hint={`${data.totals.pendingCount} pending`} />
          <Stat label="Class days" value={String(data.classDays)} hint={prettyMonth(data.month)} />
          <Stat label="Students" value={String(data.rows.length)} hint="In this filter" />
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        {loading && !data ? <p className="px-4 py-8 text-sm text-ink/60">Loading the fee sheet…</p> : null}
        {data && data.rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink/60">No students match this filter.</p>
        ) : null}
        {data && data.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Attendance</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const typed = Number(amounts[row.student.studentId]);
                  const dirty = Number.isFinite(typed) && typed !== row.fee.amount;
                  const rowBusy = busy === row.student.studentId;
                  return (
                    <tr key={row.student.studentId} className="border-t border-mist/80">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.student.name}</p>
                        <p className="font-mono text-xs text-ink/50">{row.student.studentId}</p>
                        <div className="mt-1">
                          <GradeBadge grade={row.student.grade} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="field w-28"
                          type="number"
                          min="0"
                          step="1"
                          aria-label={`Amount for ${row.student.name}`}
                          value={amounts[row.student.studentId] ?? ''}
                          onChange={(event) =>
                            setAmounts((current) => ({ ...current, [row.student.studentId]: event.target.value }))
                          }
                        />
                        {!row.fee.recorded ? <p className="mt-1 text-xs text-ink/50">Not billed yet</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill value={row.fee.status} />
                      </td>
                      <td className="px-4 py-3">{prettyDate(row.fee.paidDate)}</td>
                      <td className="px-4 py-3" title={`${row.attendance.present} present, ${row.attendance.late} late`}>
                        {data.classDays === 0 ? '—' : `${row.attendance.total}/${data.classDays}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {dirty ? (
                            <button type="button" className="btn-ghost" disabled={rowBusy} onClick={() => void save(row, row.fee.status)}>
                              Save amount
                            </button>
                          ) : null}
                          {row.fee.status === 'Paid' ? (
                            <button type="button" className="btn-ghost" disabled={rowBusy} onClick={() => void save(row, 'Pending')}>
                              Mark pending
                            </button>
                          ) : (
                            <button type="button" className="btn-primary" disabled={rowBusy} onClick={() => void save(row, 'Paid')}>
                              Mark paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
