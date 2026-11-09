import type { ReactNode } from 'react';

export function Banner({ tone, children }: { tone: 'error' | 'ok'; children: string }) {
  if (!children) return null;
  const toneClass = tone === 'error' ? 'border-clay/30 bg-red-50 text-clay' : 'border-leaf/30 bg-emerald-50 text-leaf';
  return (
    <p role="status" className={`mb-4 rounded-xl border px-3 py-2 text-sm ${toneClass}`}>
      {children}
    </p>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-display text-2xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/60">{hint}</p> : null}
    </div>
  );
}
