import QRCode from 'qrcode';

export function buildQrPayload(studentId: string): string {
  return `SMARTCLASS:${studentId}`;
}

export function candidateIds(raw: string): string[] {
  const value = raw.trim();
  const ids = new Set<string>();
  if (value) ids.add(value);

  const prefix = 'SMARTCLASS:';
  if (value.toUpperCase().startsWith(prefix)) {
    const studentId = value.slice(prefix.length).trim();
    if (studentId) ids.add(studentId);
  }

  try {
    const parsed = JSON.parse(value) as { studentId?: unknown };
    if (typeof parsed?.studentId === 'string' && parsed.studentId.trim()) {
      ids.add(parsed.studentId.trim());
    }
  } catch {
    // Plain text cards are the normal case.
  }

  return [...ids];
}

export function qrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#14221c', light: '#ffffff' },
  });
}
