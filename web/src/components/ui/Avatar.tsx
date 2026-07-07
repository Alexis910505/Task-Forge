export function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-primary-container/20 text-xs font-bold text-primary ${className}`}
    >
      {initials}
    </div>
  );
}
