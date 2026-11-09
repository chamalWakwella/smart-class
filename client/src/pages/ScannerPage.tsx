import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { RefreshCw } from 'lucide-react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { useConfig } from '../context/AppContext';
import { money, prettyDate, prettyMonth, prettyTime } from '../lib/format';
import { playAlert, primeAudio } from '../lib/sound';
import type { AttendanceList, AttendanceRow, ScanResponse } from '../types';

type ResultState = { kind: 'scan'; data: ScanResponse } | { kind: 'error'; message: string };

function cameraMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  if (/notallowed|permission|denied/i.test(text)) {
    return 'Camera permission was blocked. Allow the camera for this site, or type the student ID below.';
  }
  if (/notfound|no camera/i.test(text)) {
    return 'No camera was found. Type the student ID below.';
  }
  return 'The camera could not start. Type the student ID below.';
}

export function ScannerPage() {
  const config = useConfig();
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [register, setRegister] = useState<AttendanceList | null>(null);
  const [listError, setListError] = useState('');
  const [removing, setRemoving] = useState<AttendanceRow | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const onScanRef = useRef<(value: string) => void>(() => undefined);
  const recent = useRef<{ value: string; at: number } | null>(null);
  const lock = useRef(false);

  const loadToday = useCallback(async () => {
    try {
      const data = await api<AttendanceList>('/api/attendance');
      setRegister(data);
      setListError('');
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Today’s register could not be loaded.');
    }
  }, []);

  const handleScan = useCallback(
    async (raw: string) => {
      const qrData = raw.trim();
      if (!qrData) return;
      setScanning(true);
      try {
        const data = await api<ScanResponse>('/api/attendance/scan', {
          method: 'POST',
          body: JSON.stringify({ qrData }),
        });
        setResult({ kind: 'scan', data });
        playAlert(data.fee.status === 'Pending' ? 'warning' : data.alreadyMarked ? 'notice' : 'success');
        await loadToday();
      } catch (err) {
        setResult({ kind: 'error', message: err instanceof Error ? err.message : 'The scan could not be saved.' });
        playAlert('error');
      } finally {
        setScanning(false);
      }
    },
    [loadToday],
  );

  useEffect(() => {
    onScanRef.current = (value: string) => {
      const now = Date.now();
      if (lock.current) return;
      if (recent.current?.value === value && now - recent.current.at < 8000) return;
      recent.current = { value, at: now };
      lock.current = true;
      void handleScan(value).finally(() => {
        lock.current = false;
      });
    };
  }, [handleScan]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  useEffect(() => {
    if (!cameraOn) return undefined;
    const scanner = new Html5Qrcode('qr-reader', false);
    let active = true;

    const stop = async () => {
      try {
        const state = scanner.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scanner.stop();
        }
      } catch {
        // The camera may already be stopped.
      }
      try {
        scanner.clear();
      } catch {
        // clear() throws once the element is gone.
      }
    };

    void (async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!active) return;
        if (cameras.length === 0) throw new Error('No camera was found.');
        const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0];
        if (!preferred) throw new Error('No camera was found.');
        await scanner.start(
          preferred.id,
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (text) => onScanRef.current(text),
          () => undefined,
        );
        if (!active) await stop();
      } catch (err) {
        if (!active) return;
        setCameraError(cameraMessage(err));
        setCameraOn(false);
      }
    })();

    return () => {
      active = false;
      void stop();
    };
  }, [cameraOn]);

  async function removeMark() {
    if (!removing) return;
    try {
      await api(`/api/attendance/${removing.attendance._id}`, { method: 'DELETE' });
      setRemoving(null);
      await loadToday();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'The mark could not be removed.');
      setRemoving(null);
    }
  }

  const scanned = result?.kind === 'scan' ? result.data : null;
  const paid = scanned?.fee.status === 'Paid';

  return (
    <section onPointerDown={primeAudio}>
      <PageHeader
        title="Attendance"
        lede={`Scan a smart card to mark today. Arrivals at or after ${config.lateAfter} (${config.timezone}) are marked Late.`}
        actions={
          <button type="button" className="btn-ghost" onClick={() => void loadToday()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink">Class camera</p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setCameraError('');
                setCameraOn((on) => !on);
              }}
            >
              {cameraOn ? 'Stop camera' : 'Start camera'}
            </button>
          </div>
          {cameraOn ? (
            <div id="qr-reader" />
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-ink px-6 text-center text-sm text-white/80">
              {cameraError || 'The camera is off.'}
            </div>
          )}
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              primeAudio();
              void handleScan(manual);
              setManual('');
            }}
          >
            <label className="sr-only" htmlFor="manual-id">
              Student ID
            </label>
            <input
              id="manual-id"
              className="field"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="Or type MATH-9-001"
            />
            <button type="submit" className="btn-primary" disabled={scanning || !manual.trim()}>
              Mark
            </button>
          </form>
        </div>

        <div ref={resultRef} aria-live="assertive">
          {scanning ? <p className="mb-2 text-sm text-ink/70">Checking the register…</p> : null}
          {scanned ? (
            <article className={paid ? 'scan-card scan-card-paid' : 'scan-card scan-card-due'}>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/60">
                {scanned.alreadyMarked ? 'Already recorded today' : 'Marked just now'}
              </p>
              <h2 className="mt-2 font-display text-4xl leading-none text-ink">{scanned.student.name}</h2>
              <p className="mt-2 font-mono text-sm text-ink/70">{scanned.student.studentId}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill value={scanned.attendance.status} />
                <span className="text-sm text-ink/70">Grade {scanned.student.grade}</span>
                <span className="text-sm text-ink/70">{prettyTime(scanned.attendance.timestamp)}</span>
              </div>
              <p className="mt-6 font-display text-5xl leading-none">{paid ? 'Fee paid' : 'Fee pending'}</p>
              <p className="mt-3 text-sm text-ink/80">
                {prettyMonth(scanned.fee.month)} · {money(scanned.fee.amount, config.currency)}
                {scanned.fee.paidDate ? ` · paid ${prettyDate(scanned.fee.paidDate)}` : ''}
              </p>
              {!scanned.fee.recorded ? (
                <p className="mt-1 text-sm text-ink/70">No fee has been saved for this month yet.</p>
              ) : null}
              {!paid ? (
                <p className="mt-4 text-sm font-medium">
                  Call guardian{' '}
                  <a className="underline" href={`tel:${scanned.student.guardianPhone}`}>
                    {scanned.student.guardianPhone}
                  </a>
                </p>
              ) : null}
            </article>
          ) : result?.kind === 'error' ? (
            <article className="scan-card scan-card-due">
              <h2 className="font-display text-4xl leading-none">Card not recognised</h2>
              <p className="mt-3 text-sm">{result.message}</p>
            </article>
          ) : (
            <article className="panel flex min-h-[280px] items-center p-6">
              <div>
                <p className="font-display text-3xl">Waiting for a card</p>
                <p className="mt-2 max-w-sm text-sm text-ink/70">
                  A paid month flashes green. A pending month flashes red and plays a warning tone.
                </p>
              </div>
            </article>
          )}
        </div>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-mist px-4 py-3">
          <h2 className="font-display text-2xl">Today’s register</h2>
          <p className="text-sm text-ink/60">
            {prettyDate(register?.date ?? config.today)} · {register?.records.length ?? 0} marked
          </p>
        </div>
        {listError ? <p className="px-4 py-3 text-sm text-clay">{listError}</p> : null}
        {register && register.records.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink/60">No one has been marked yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Attendance</th>
                  <th className="px-4 py-2 font-medium">Fee</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {register?.records.map((row) => (
                  <tr key={row.attendance._id} className="border-t border-mist/80">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.student?.name ?? row.attendance.studentId}</p>
                      <p className="font-mono text-xs text-ink/50">{row.attendance.studentId}</p>
                    </td>
                    <td className="px-4 py-3">{prettyTime(row.attendance.timestamp)}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={row.attendance.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill value={row.feeStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-sm text-clay hover:underline" onClick={() => setRemoving(row)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {removing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="panel w-full max-w-md p-5" role="dialog" aria-modal="true" aria-label="Remove attendance">
            <h2 className="font-display text-2xl">Remove this mark?</h2>
            <p className="mt-2 text-sm text-ink/70">
              {removing.student?.name ?? removing.attendance.studentId} will no longer be marked for today. You can scan the card again.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setRemoving(null)}>
                Keep
              </button>
              <button type="button" className="btn-danger" onClick={() => void removeMark()}>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
