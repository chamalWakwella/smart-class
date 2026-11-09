import { useEffect, useState } from 'react';
import { Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { api } from '../api';
import { Banner, EmptyState } from '../components/Feedback';
import { GradeBadge } from '../components/StatusPill';
import { GradeFilter } from '../components/GradeFilter';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { PrintDialog } from '../components/SmartCard';
import { StudentForm } from '../components/StudentForm';
import type { Student } from '../types';

export function StudentsPage() {
  const [grade, setGrade] = useState('');
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [printStudents, setPrintStudents] = useState<Student[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (query.trim()) params.set('q', query.trim());
      setLoading(true);
      api<Student[]>(`/api/students?${params.toString()}`)
        .then((rows) => {
          if (!cancelled) {
            setStudents(rows);
            setError('');
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Students could not be loaded.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [grade, query, refreshKey]);

  function handleSaved(saved: Student, created: boolean) {
    setFormOpen(false);
    setEditing(null);
    setRefreshKey((value) => value + 1);
    setNotice(created ? `${saved.name} added as ${saved.studentId}.` : `${saved.name} updated.`);
    setError('');
    if (created) setPrintStudents([saved]);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api(`/api/students/${encodeURIComponent(pendingDelete.studentId)}`, { method: 'DELETE' });
      setNotice(`${pendingDelete.name} was removed.`);
      setError('');
      setPendingDelete(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The student could not be removed.');
      setPendingDelete(null);
    }
  }

  return (
    <section>
      <PageHeader
        title="Students"
        lede="Each student gets a permanent ID and a QR smart card. Grade stays on the record even if the ID was issued in an earlier year."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add student
          </button>
        }
      />
      <Banner tone="ok" children={notice} />
      <Banner tone="error" children={error} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <GradeFilter value={grade} onChange={setGrade} />
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, ID, or phone"
          />
        </label>
        <button type="button" className="btn-ghost" disabled={students.length === 0} onClick={() => setPrintStudents(students)}>
          <Printer className="h-4 w-4" />
          Print visible cards
        </button>
      </div>

      <div className="panel overflow-hidden">
        {loading && students.length === 0 ? <p className="px-4 py-8 text-sm text-ink/60">Loading students…</p> : null}
        {!loading && students.length === 0 ? (
          <EmptyState
            title="No students yet"
            body="Add the class, then print a card for each student. The QR code is the thing you scan at the door."
            action={
              <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
                Add the first student
              </button>
            }
          />
        ) : null}
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Guardian</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.studentId} className="border-t border-mist/80">
                    <td className="px-4 py-3">
                      <p className="font-medium">{student.name}</p>
                      <p className="font-mono text-xs text-ink/50">{student.studentId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <GradeBadge grade={student.grade} />
                    </td>
                    <td className="px-4 py-3">
                      <a className="hover:underline" href={`tel:${student.guardianPhone}`}>
                        {student.guardianPhone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-ghost px-2" onClick={() => setPrintStudents([student])} aria-label={`Print card for ${student.name}`}>
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-2"
                          onClick={() => {
                            setEditing(student);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${student.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-danger px-2" onClick={() => setPendingDelete(student)} aria-label={`Remove ${student.name}`}>
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

      {formOpen ? (
        <StudentForm
          key={editing?.studentId ?? 'new'}
          student={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}

      <PrintDialog students={printStudents} onClose={() => setPrintStudents(null)} />

      {pendingDelete ? (
        <Modal title="Remove student" onClose={() => setPendingDelete(null)}>
          <p className="text-sm text-ink/80">
            Remove {pendingDelete.name} ({pendingDelete.studentId})? Their attendance, fees, and marks are removed as well.
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
