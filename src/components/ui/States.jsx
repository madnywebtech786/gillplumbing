export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="text-sm text-ink-muted max-w-sm">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong. Please try again." }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      {label}
    </div>
  );
}
