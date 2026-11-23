import { ROLES } from "@/constants/roles";

export const ADMIN_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inquiries", label: "Inquiries" },
  { href: "/bookings", label: "Bookings" },
  { href: "/daily-reports", label: "Job Reports" },
  { href: "/ledger", label: "Ledger" },
  { href: "/employees", label: "Employees" },
  { href: "/reports", label: "Reports" },
  { href: "/audit", label: "Audit Log" },
];

export const EMPLOYEE_NAV_LINKS = [
  { href: "/dashboard", label: "My Dashboard" },
  { href: "/inquiries", label: "Inquiries" },
  { href: "/bookings", label: "Bookings" },
  { href: "/daily-reports", label: "My Daily Reports" },
];

export function getNavLinksForRole(role) {
  return role === ROLES.ADMIN ? ADMIN_NAV_LINKS : EMPLOYEE_NAV_LINKS;
}
