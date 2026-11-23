import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getInquiriesListForActor } from "@/server/queries/inquiries";
import { Table, TableHead, TableBody, TableCell, TableEmptyState } from "@/components/ui/Table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { INQUIRY_STATUS_DISPLAY } from "@/lib/status-display";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { ROLES } from "@/constants/roles";

export default async function InquiriesPage() {
  const actor = await requireUser();
  const inquiries = await getInquiriesListForActor(actor);

  const columns =
    actor.role === ROLES.ADMIN
      ? ["Inquiry", "Customer", "Phone", "Summary", "Status", "Created by", "Created"]
      : ["Inquiry", "Customer", "Phone", "Summary", "Status", "Created"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Inquiries</h1>
          <p className="text-sm text-ink-muted mt-1">
            {actor.role === ROLES.ADMIN
              ? "All customer inquiries across the business."
              : "Inquiries you've created."}
          </p>
        </div>
        <Link href="/inquiries/new">
          <Button>New inquiry</Button>
        </Link>
      </div>

      <Table>
        <TableHead columns={columns} />
        <TableBody>
          {inquiries.length === 0 ? (
            <TableEmptyState
              colSpan={columns.length}
              message="No inquiries yet. Create one to get started."
            />
          ) : (
            inquiries.map((inquiry) => (
              <ClickableRow key={inquiry.id} href={`/inquiries/${inquiry.id}`}>
                <TableCell>
                  <Link
                    href={`/inquiries/${inquiry.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {inquiry.inquiryNumber}
                  </Link>
                </TableCell>
                <TableCell>{inquiry.customerName}</TableCell>
                <TableCell>{inquiry.customerPhone}</TableCell>
                <TableCell className="max-w-xs truncate">{inquiry.callSummary}</TableCell>
                <TableCell>
                  <Badge tone={INQUIRY_STATUS_DISPLAY[inquiry.status]?.tone}>
                    {INQUIRY_STATUS_DISPLAY[inquiry.status]?.label}
                  </Badge>
                </TableCell>
                {actor.role === ROLES.ADMIN && <TableCell>{inquiry.createdByName}</TableCell>}
                <TableCell>{formatDateTimeInBusinessZone(inquiry.createdAt, "PP")}</TableCell>
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
