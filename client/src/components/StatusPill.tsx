import type { FeeStatus, AttendanceStatus } from '../types';

export function StatusPill({ value }: { value: FeeStatus | AttendanceStatus | string }) {
  const styles: Record<string, string> = {
    Paid: 'bg-leaf/10 text-leaf',
    Pending: 'bg-clay/10 text-clay',
    Present: 'bg-leaf/10 text-leaf',
    Late: 'bg-amber-100 text-amber-900',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[value] ?? 'bg-mist text-ink'}`}>
      {value}
    </span>
  );
}

export function GradeBadge({ grade }: { grade: number }) {
  return <span className="inline-flex rounded-full bg-board/10 px-2 py-0.5 text-xs font-medium text-board">Grade {grade}</span>;
}
