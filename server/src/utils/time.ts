import { env } from '../config/env';

export function isRealDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function zonedParts(date = new Date(), timeZone = env.timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  let hour = read('hour');
  if (hour === '24') hour = '00';

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour,
    minute: read('minute'),
  };
}

export function todayISO(date = new Date()): string {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function currentMonth(date = new Date()): string {
  return todayISO(date).slice(0, 7);
}

export function isLate(date = new Date()): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(env.lateAfter);
  if (!match) return false;
  const parts = zonedParts(date);
  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const cutoffMinutes = Number(match[1]) * 60 + Number(match[2]);
  return nowMinutes >= cutoffMinutes;
}

export function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
