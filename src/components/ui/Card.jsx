export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-border bg-paper-raised p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {description && (
          <p className="text-sm text-ink-muted mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <Card>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="font-display text-3xl font-semibold text-ink mt-2">
        {value}
      </p>
      {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </Card>
  );
}
