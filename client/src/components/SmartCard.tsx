import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useConfig } from '../context/AppContext';
import type { Student } from '../types';

export function SmartCard({ student }: { student: Student }) {
  const config = useConfig();
  return (
    <article className="smart-card">
      <div className="smart-card-band">
        <img src="/class-logo.svg" alt="" className="h-8 w-8 rounded-md" />
        <div className="min-w-0">
          <p className="text-[9px] font-medium tracking-[0.18em] text-gold">SMART CLASS</p>
          <p className="truncate text-[11px] text-white/80">{config.teacherName}</p>
        </div>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[10px] text-white">Grade {student.grade}</span>
      </div>
      <div className="smart-card-body">
        <div className="min-w-0 flex-1">
          <p className="smart-card-name">{student.name}</p>
          <p className="smart-card-id">{student.studentId}</p>
          <p className="smart-card-id">Tel {config.teacherPhone}</p>
        </div>
        <div className="rounded-md bg-white p-0.5" role="img" aria-label={`QR code for ${student.studentId}`}>
          <QRCodeSVG value={student.qrCodeData} size={92} level="M" includeMargin fgColor="#14221c" bgColor="#ffffff" />
        </div>
      </div>
    </article>
  );
}

export function PrintDialog({ students, onClose }: { students: Student[] | null; onClose: () => void }) {
  useEffect(() => {
    if (!students?.length) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, students]);

  if (!students?.length) return null;

  return createPortal(
    <div className="print-host">
      <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 p-4">
        <div className="panel mx-auto my-8 w-fit max-w-full p-5">
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">{students.length === 1 ? 'Smart card' : 'Smart cards'}</h2>
              <p className="mt-1 max-w-xl text-sm text-ink/70">
                Cards are shown at print size. Swap <span className="font-medium">client/public/class-logo.svg</span> for your own logo.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
          <div className="print-sheet flex flex-wrap gap-4">
            {students.map((student) => (
              <SmartCard key={student.studentId} student={student} />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
