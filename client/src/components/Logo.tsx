export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1b3027" />
      <path d="M14 34V16L34 34Z" fill="none" stroke="#f3f6f4" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 28H20V34" fill="none" stroke="#d4a054" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
