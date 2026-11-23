import { requireUser } from "@/lib/auth/dal";
import { getNavLinksForRole } from "@/components/layout/NavLinks";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }) {
  const user = await requireUser();
  const links = getNavLinksForRole(user.role);

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
