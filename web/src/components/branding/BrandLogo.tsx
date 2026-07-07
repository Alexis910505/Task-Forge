type BrandLogoProps = {
  /** Tailwind classes for size (e.g. h-10 w-10) */
  className?: string;
  alt: string;
};

/** Logo TaskForge (`assets/taskforge_logo` → `public/logo.png`). */
export function BrandLogo({ className = 'h-10 w-10', alt }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`object-contain ${className}`}
      decoding="async"
    />
  );
}
