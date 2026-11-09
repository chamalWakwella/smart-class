const options = [
  { value: '', label: 'All grades' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
];

export function GradeFilter({ value, onChange }: { value: string; onChange: (grade: string) => void }) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-mist bg-white p-1" role="group" aria-label="Grade">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={value === option.value}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            value === option.value ? 'bg-board text-white' : 'text-ink/70 hover:text-ink'
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
