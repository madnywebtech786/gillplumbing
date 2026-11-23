import { Checkbox } from "@/components/ui/FormField";

export function EmployeeCheckboxList({ employees, defaultSelectedIds = [] }) {
  if (employees.length === 0) {
    return <p className="text-sm text-ink-muted">No active employees to assign yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
      {employees.map((employee) => (
        <label key={employee.id} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
          <Checkbox
            name="assignedEmployeeIds"
            value={employee.id}
            defaultChecked={defaultSelectedIds.includes(employee.id)}
          />
          {employee.name}
        </label>
      ))}
    </div>
  );
}
