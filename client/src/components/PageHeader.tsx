import type { ReactNode } from 'react';

export function PageHeader({
  title,
  lede,
  actions,
}: {
  title: string;
  lede: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">{lede}</p>
      </div>
      {actions}
    </header>
  );
}
