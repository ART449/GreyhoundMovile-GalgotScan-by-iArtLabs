export function GreyhoundMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M8 34c6-1 10-8 16-10 3-1 6 1 9 1 4 0 7-4 12-5 5-1 9 2 13 1 4-1 7-5 12-4-3 3-6 6-6 10 0 4 4 6 4 10-6-1-10-5-16-5-5 0-8 4-14 5-6 1-11-2-16-1-5 1-9 5-14 3 2-2 4-4 0-5z"
        fill="currentColor"
      />
      <path
        d="M62 16c3-1 7-6 10-8-4 0-8 1-10 4-1 2-2 4 0 4z"
        fill="currentColor"
      />
      <circle cx="70.5" cy="9.2" r="1.1" fill="var(--color-bg)" />
    </svg>
  );
}
