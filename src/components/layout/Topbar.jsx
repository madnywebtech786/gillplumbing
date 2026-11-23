"use client";

import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/Button";

export function Topbar({ user, title, onToggleSidebar }) {
  return (
    <header className="h-16 shrink-0 border-b border-border bg-paper-raised flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-paper text-ink"
          aria-label="Toggle navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        {title && (
          <h1 className="font-display text-lg font-semibold text-ink">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-ink">{user.name}</p>
          <p className="text-xs text-ink-muted">{user.role === "ADMIN" ? "Admin" : "Employee"}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
