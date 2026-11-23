"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ user, links, title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        links={links}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          title={title}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
