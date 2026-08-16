export function ProgressRing({
  percent,
  size = 120,
  stroke = 10,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-gold"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-text-primary">{Math.round(percent)}%</span>
        {label ? <span className="text-xs text-text-muted">{label}</span> : null}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[1.5rem] border border-border bg-surface p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">{title}</h1>
        {subtitle ? <p className="mt-2 text-text-secondary">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function PrimaryButton({
  children,
  href,
  type = "button",
  className = "",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const classes = `inline-flex items-center justify-center rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-graphite hover:bg-gold-strong disabled:opacity-50 ${className}`;
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  href,
  type = "button",
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  className?: string;
  onClick?: () => void;
}) {
  const classes = `inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-alt ${className}`;
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" | string }) {
  const published = status === "PUBLISHED";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        published ? "bg-green-50 text-success" : "bg-amber-50 text-amber-700"
      }`}
    >
      {published ? "Publicado" : "Borrador"}
    </span>
  );
}
