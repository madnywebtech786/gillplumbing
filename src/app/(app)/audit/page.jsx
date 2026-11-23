import { requireAdmin } from "@/lib/auth/dal";
import { listAuditLogForActor } from "@/server/queries/audit";
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Select } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { AUDIT_ACTION_DISPLAY, AUDIT_ENTITY_TYPE_DISPLAY } from "@/lib/status-display";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { ALL_AUDIT_ACTIONS, ALL_AUDIT_ENTITY_TYPES } from "@/constants/statuses";

export default async function AuditLogPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;

  const startDate = params?.startDate ? new Date(`${params.startDate}T00:00:00Z`) : undefined;
  const endDate = params?.endDate ? new Date(`${params.endDate}T23:59:59Z`) : undefined;

  const entries = await listAuditLogForActor({
    entityType: params?.entityType || undefined,
    action: params?.action || undefined,
    startDate,
    endDate,
  });

  const columns = ["Date", "Action", "Entity", "Summary", "Actor"];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Audit Log</h1>
        <p className="text-sm text-ink-muted mt-1">
          A chronological record of important changes across the business.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <FieldWrapper label="From" htmlFor="startDate">
          <DatePicker id="startDate" name="startDate" defaultValue={params?.startDate || ""} />
        </FieldWrapper>
        <FieldWrapper label="To" htmlFor="endDate">
          <DatePicker id="endDate" name="endDate" defaultValue={params?.endDate || ""} />
        </FieldWrapper>
        <FieldWrapper label="Entity type" htmlFor="entityType">
          <Select id="entityType" name="entityType" defaultValue={params?.entityType || ""}>
            <option value="">All entities</option>
            {ALL_AUDIT_ENTITY_TYPES.map((entityType) => (
              <option key={entityType} value={entityType}>
                {AUDIT_ENTITY_TYPE_DISPLAY[entityType]}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Action" htmlFor="action">
          <Select id="action" name="action" defaultValue={params?.action || ""}>
            <option value="">All actions</option>
            {ALL_AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {AUDIT_ACTION_DISPLAY[action]?.label ?? action}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <Table>
        <TableHead columns={columns} />
        <TableBody>
          {entries.length === 0 ? (
            <TableEmptyState colSpan={columns.length} message="No audit events match these filters." />
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDateTimeInBusinessZone(entry.createdAt, "PPp")}</TableCell>
                <TableCell>
                  <Badge tone={AUDIT_ACTION_DISPLAY[entry.action]?.tone}>
                    {AUDIT_ACTION_DISPLAY[entry.action]?.label ?? entry.action}
                  </Badge>
                </TableCell>
                <TableCell>{AUDIT_ENTITY_TYPE_DISPLAY[entry.entityType] ?? entry.entityType}</TableCell>
                <TableCell className="max-w-md truncate">{entry.summary}</TableCell>
                <TableCell>{entry.actorName}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
