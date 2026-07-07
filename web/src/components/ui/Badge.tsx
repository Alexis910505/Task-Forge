type BadgeProps = {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'neutral' | 'error' | 'primary';
};

const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
  success: 'bg-tertiary-container text-on-tertiary',
  warning: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container-highest text-on-surface-variant',
  error: 'bg-error-container text-on-error-container',
  primary: 'bg-primary-container/20 text-primary',
};

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
