import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Student } from '../types';
import { Modal } from './Modal';

export function StudentForm({
  student,
  onClose,
  onSaved,
}: {
  student: Student | null;
  onClose: () => void;
  onSaved: (student: Student, created: boolean) => void;
}) {
  const [name, setName] = useState(student?.name ?? '');
  const [grade, setGrade] = useState(String(student?.grade ?? 10));
  const [phone, setPhone] = useState(student?.guardianPhone ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = JSON.stringify({ name, grade: Number(grade), guardianPhone: phone });
    try {
      const saved = student
        ? await api<Student>(`/api/students/${encodeURIComponent(student.studentId)}`, { method: 'PUT', body })
        : await api<Student>('/api/students', { method: 'POST', body });
      onSaved(saved, !student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The student could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={student ? 'Edit student' : 'New student'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-clay">{error}</p> : null}
        <label className="block">
          <span className="label">Student name</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        </label>
        <label className="block">
          <span className="label">Grade</span>
          <select className="field" value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Guardian phone</span>
          <input
            className="field"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            inputMode="tel"
            placeholder="0771234567"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : student ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
