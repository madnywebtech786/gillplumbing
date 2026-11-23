export function Table({ children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ columns }) {
  return (
    <thead className="bg-paper border-b border-border">
      <tr>
        {columns.map((column) => (
          <th
            key={column}
            className="px-4 py-3 text-left font-medium text-ink-muted"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TableBody({ children }) {
  return (
    <tbody className="divide-y divide-border bg-paper-raised">
      {children}
    </tbody>
  );
}

export function TableRow({ children, href, onClick, className = "" }) {
  const interactive = Boolean(href || onClick);
  return (
    <tr
      className={`${interactive ? "cursor-pointer hover:bg-paper transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "" }) {
  return <td className={`px-4 py-3 text-ink ${className}`}>{children}</td>;
}

export function TableEmptyState({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-ink-muted">
        {message}
      </td>
    </tr>
  );
}
