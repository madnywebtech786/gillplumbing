import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { listLedgerTransactions } from "@/server/queries/ledger";
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { Badge } from "@/components/ui/Badge";
import { FieldWrapper, Select } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { LEDGER_TRANSACTION_TYPE_DISPLAY } from "@/lib/status-display";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { ALL_LEDGER_TRANSACTION_TYPES } from "@/constants/statuses";

export default async function LedgerPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;

  const filters = {
    type: params?.type || undefined,
    startDate: params?.startDate ? new Date(`${params.startDate}T00:00:00Z`) : undefined,
    endDate: params?.endDate ? new Date(`${params.endDate}T23:59:59Z`) : undefined,
  };

  const transactions = await listLedgerTransactions(filters);

  // A running balance only makes sense scoped to one job report or
  // customer (spec 6.7); this global view spans many customers, so no
  // balance column here - see the per-job-report ledger on the job
  // report detail page for a scoped running balance instead.
  const columns = [
    "Date",
    "Type",
    "Description",
    "Customer",
    "Job report",
    "Amount",
    "Method",
    "Reference",
    "Recorded by",
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Ledger</h1>

      <form className="flex flex-wrap items-end gap-2">
        <FieldWrapper label="From" htmlFor="startDate">
          <DatePicker id="startDate" name="startDate" defaultValue={params?.startDate || ""} />
        </FieldWrapper>
        <FieldWrapper label="To" htmlFor="endDate">
          <DatePicker id="endDate" name="endDate" defaultValue={params?.endDate || ""} />
        </FieldWrapper>
        <FieldWrapper label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue={params?.type || ""}>
            <option value="">All types</option>
            {ALL_LEDGER_TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {LEDGER_TRANSACTION_TYPE_DISPLAY[type]?.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Link href="/ledger">
          <Button type="button" variant="ghost">
            Reset filters
          </Button>
        </Link>
      </form>

      <Table>
        <TableHead columns={columns} />
        <TableBody>
          {transactions.length === 0 ? (
            <TableEmptyState colSpan={columns.length} message="No ledger transactions yet." />
          ) : (
            transactions.map((tx) => {
              const RowComponent = tx.jobReportId ? ClickableRow : TableRow;
              const rowProps = tx.jobReportId ? { href: `/daily-reports/${tx.jobReportId}` } : {};
              return (
                <RowComponent key={tx.id} {...rowProps}>
                  <TableCell>{formatDateTimeInBusinessZone(tx.occurredAt, "PPp")}</TableCell>
                  <TableCell>
                    <Badge tone={LEDGER_TRANSACTION_TYPE_DISPLAY[tx.type]?.tone}>
                      {LEDGER_TRANSACTION_TYPE_DISPLAY[tx.type]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>{tx.customerName || "—"}</TableCell>
                  <TableCell>
                    {tx.jobReportId ? (
                      <Link href={`/daily-reports/${tx.jobReportId}`} className="hover:text-accent">
                        {tx.jobReportNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{tx.formattedAmount}</TableCell>
                  <TableCell>{tx.paymentMethod ? tx.paymentMethod.replaceAll("_", " ") : "—"}</TableCell>
                  <TableCell>{tx.reference || "—"}</TableCell>
                  <TableCell>{tx.recordedByName}</TableCell>
                </RowComponent>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
