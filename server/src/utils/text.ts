import { HttpError } from './httpError';

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function asGrade(value: number): 9 | 10 | 11 {
  if (value === 9 || value === 10 || value === 11) return value;
  throw new HttpError(400, 'Grade must be 9, 10, or 11.');
}
