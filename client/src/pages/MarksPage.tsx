import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../api';
import { Banner, EmptyState, Stat } from '../components/Feedback';
import { GradeFilter } from '../components/GradeFilter';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { GradeBadge } from '../components/StatusPill';
import { points, prettyDate, todayValue } from '../lib/format';
import type { Mark, MarkSummary, Student } from '../types';

type FormState = {
  studentId: string;
  examTitle: string;
  score: string;
  totalMarks: string;
  date: string;
};

const emptyForm = (): FormState => ({
  studentId: '',
  examTitle: '',
  score: '',
  totalMarks: '100',
  date: todayValue(),
});

export function MarksPage() {
  const [grade, setGrade] = useState('');
  const [exam, setExam] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<string[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [summary, setSummary] = useState<MarkSummary | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Mark | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mark | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (grade) params.set('grade', grade);
    if (exam) params.set('examTitle', exam);
    const summaryParams = new URLSearchParams(params);
    setLoading(true);
    Promise.all([
      api<Student[]>('/api/students'),
      api<string[]>('/api/marks/exams'),
      api<Mark[]>(`/api/marks?${params.toString()}`),
      exam ? api<MarkSummary>(`/api/marks/summary?${summaryParams.toString()}`) : Promise.resolve(null),
    ])
      .then(([studentRows, examTitles, markRows, summaryRow]) => {
        if (cancelled) return;
        setStudents(studentRows);
        setExams(examTitles);
        setMarks(markRows);
        setSummary(summaryRow);
        setError('');
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Marks could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [grade, exam, refreshKey]);

  const visibleStudents = students.filter((student) => !grade || String(student.grade) === grade || student.studentId === form.studentId);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function startEdit(mark: Mark) {
    setEditing(mark);
    setForm({
      studentId: mark.studentId,
      examTitle: mark.examTitle,
      score: String(mark.score),
      totalMarks: String(mark.totalMarks),
      date: mark.date,
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const score = Number(form.score);
    const totalMarks = Number(form.totalMarks);
    if (!form.studentId) {
      setError('Choose a student.');
      return;
    }
    if (!Number.isFinite(score) || !Number.isFinite(totalMarks) || score > totalMarks) {
      setError('Score cannot exceed the total.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api(`/api/marks/${editing._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            examTitle: form.examTitle,
            score,
            totalMarks,
            date: form.date,
          }),
        });
        setNotice(`Updated ${form.examTitle} for ${editing.studentName}.`);
      } else {
        await api('/api/marks', {
          method: 'POST',
          body: JSON.stringify({
            studentId: form.studentId,
            examTitle: form.examTitle,
            score,
            totalMarks,
            date: form.date,
          }),
        });
        setNotice('Marks saved.');
      }
      setEditing(null);
      setForm(emptyForm());
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Marks could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api(`/api/marks/${pendingDelete._id}`, { method: 'DELETE' });
      setNotice(`Removed ${pendingDelete.examTitle} for ${pendingDelete.studentName}.`);
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Marks could not be removed.');
      setPendingDelete(null);
    }
  }

  return (
    <section>
      <PageHeader
        title="Marks"
        lede="Enter one exam at a time. Pick that exam below to see the class average, highest, and lowest."
      />
      <Banner tone="ok" children={notice} />
      <Banner tone="error" children={error} />

      <form onSubmit={onSubmit} className="panel mb-5 grid gap-3 p-4 md:grid-cols-6">
        <label className="md:col-span-2">
          <span className="label">Student</span>
          <select
            className="field"
            value={form.studentId}
            disabled={Boolean(editing)}
            onChange={(event) => updateForm({ studentId: event.target.value })}
            required
          >
            <option value="">Choose</option>
            {visibleStudents.map((student) => (
              <option key={student.studentId} value={student.studentId}>
                {student.name} · {student.studentId}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="label">Exam</span>
          <input
            className="field"
            list="exam-titles"
            value={form.examTitle}
            onChange={(event) => updateForm({ examTitle: event.target.value })}
            required
            minLength={2}
          />
          <datalist id="exam-titles">
            {exams.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>
        </label>
        <label>
          <span className="label">Score</span>
          <input className="field" type="number" min="0" step="0.5" value={form.score} onChange={(event) => updateForm({ score: event.target.value })} required />
        </label>
        <label>
          <span className="label">Out of</span>
          <input
            className="field"
            type="number"
            min="1"
            step="0.5"
            value={form.totalMarks}
            onChange={(event) => updateForm({ totalMarks: event.target.value })}
            required
          />
        </label>
        <label>
          <span className="label">Date</span>
          <input className="field" type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} required />
        </label>
        <div className="flex items-end gap-2 md:col-span-5">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add marks'}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm());
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <GradeFilter value={grade} onChange={setGrade} />
        <label>
          <span className="sr-only">Exam filter</span>
          <select className="field" value={exam} onChange={(event) => setExam(event.target.value)}>
            <option value="">All exams</option>
            {exams.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {summary && summary.count > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entries" value={String(summary.count)} hint={summary.examTitle} />
          <Stat label="Average" value={`${summary.averagePercentage.toFixed(1)}%`} />
          <Stat label="Highest" value={`${summary.highest?.percentage.toFixed(1) ?? '—'}%`} hint={summary.highest?.name} />
          <Stat label="Lowest" value={`${summary.lowest?.percentage.toFixed(1) ?? '—'}%`} hint={summary.lowest?.name} />
        </div>
      ) : null}
      {exam && summary && summary.count === 0 ? (
        <p className="mb-4 text-sm text-ink/60">No marks for {exam} in this grade yet.</p>
      ) : null}

      <div className="panel overflow-hidden">
        {loading && marks.length === 0 ? <p className="px-4 py-8 text-sm text-ink/60">Loading marks…</p> : null}
        {!loading && marks.length === 0 ? (
          <EmptyState title="No marks in this view" body="Use the form above to record a score. One row is kept per student and exam." />
        ) : null}
        {marks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Exam</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Percent</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {marks.map((mark) => (
                  <tr key={mark._id} className="border-t border-mist/80">
                    <td className="px-4 py-3">
                      <p className="font-medium">{mark.studentName}</p>
                      <p className="font-mono text-xs text-ink/50">{mark.studentId}</p>
                      {mark.grade ? (
                        <div className="mt-1">
                          <GradeBadge grade={mark.grade} />
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{mark.examTitle}</td>
                    <td className="px-4 py-3">
                      {points(mark.score)} / {points(mark.totalMarks)}
                    </td>
                    <td className="px-4 py-3">{mark.percentage.toFixed(1)}%</td>
                    <td className="px-4 py-3">{prettyDate(mark.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-ghost px-2" onClick={() => startEdit(mark)} aria-label={`Edit ${mark.examTitle}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-danger px-2" onClick={() => setPendingDelete(mark)} aria-label={`Delete ${mark.examTitle}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {pendingDelete ? (
        <Modal title="Remove marks" onClose={() => setPendingDelete(null)}>
          <p className="text-sm text-ink/80">
            Remove {pendingDelete.examTitle} for {pendingDelete.studentName}?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setPendingDelete(null)}>
              Keep
            </button>
            <button type="button" className="btn-danger" onClick={() => void confirmDelete()}>
              Remove
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
