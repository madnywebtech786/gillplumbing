import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getEmployeesList } from "@/server/queries/employees";
import { Table, TableHead, TableBody, TableCell, TableEmptyState } from "@/components/ui/Table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { Badge } from "@/components/ui/Badge";
import { EmployeeStatusToggle } from "@/components/forms/EmployeeStatusToggle";
import { NewEmployeeDialog } from "@/components/forms/NewEmployeeDialog";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";

export default async function EmployeesPage() {
  await requireAdmin();
  const employees = await getEmployeesList();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Employees</h1>
          <p className="text-sm text-ink-muted mt-1">
            Manage staff accounts and review their work.
          </p>
        </div>
        <NewEmployeeDialog />
      </div>

      <Table>
        <TableHead columns={["Name", "Email", "Phone", "Status", "Created", "Actions"]} />
        <TableBody>
          {employees.length === 0 ? (
            <TableEmptyState colSpan={6} message="No employees yet. Create the first one above." />
          ) : (
            employees.map((employee) => (
              <ClickableRow key={employee.id} href={`/employees/${employee.id}`}>
                <TableCell>
                  <Link href={`/employees/${employee.id}`} className="font-medium hover:text-accent">
                    {employee.name}
                  </Link>
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone ?? "-"}</TableCell>
                <TableCell>
                  <Badge tone={employee.isActive ? "success" : "danger"}>
                    {employee.isActive ? "Active" : "Deactivated"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTimeInBusinessZone(employee.createdAt, "PP")}</TableCell>
                <TableCell>
                  <EmployeeStatusToggle employeeId={employee.id} isActive={employee.isActive} />
                </TableCell>
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
