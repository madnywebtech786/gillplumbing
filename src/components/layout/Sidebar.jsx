"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ links, open, onNavigate }) {
  const pathname = usePathname();

  return (
    <aside
      className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-paper-raised transition-transform duration-200 flex flex-col`}
    >
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="font-display text-lg font-semibold text-ink">
          Plumbing Ops
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-paper hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
