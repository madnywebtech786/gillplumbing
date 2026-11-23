import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getInquiryDetailForActor } from "@/server/queries/inquiries";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CloseInquiryDialog } from "@/components/forms/CloseInquiryDialog";
import { INQUIRY_STATUS_DISPLAY } from "@/lib/status-display";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { INQUIRY_STATUS } from "@/constants/statuses";

export default async function InquiryDetailPage({ params }) {
  const actor = await requireUser();
  const { id } = await params;

  const inquiry = await getInquiryDetailForActor(id, actor);
  if (!inquiry) {
    notFound();
  }

  const canTakeAction =
    inquiry.status !== INQUIRY_STATUS.CONVERTED && inquiry.status !== INQUIRY_STATUS.CLOSED;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Link href="/inquiries" className="text-sm text-ink-muted hover:text-ink">
        ← Back to inquiries
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {inquiry.inquiryNumber}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Created by {inquiry.createdByName} on{" "}
            {formatDateTimeInBusinessZone(inquiry.createdAt, "PPp")}
          </p>
        </div>
        <Badge tone={INQUIRY_STATUS_DISPLAY[inquiry.status]?.tone}>
          {INQUIRY_STATUS_DISPLAY[inquiry.status]?.label}
        </Badge>
      </div>

      {canTakeAction && (
        <div className="flex gap-2">
          <Link href={`/bookings/new?inquiryId=${inquiry.id}`}>
            <Button>Convert to booking</Button>
          </Link>
          <CloseInquiryDialog inquiryId={inquiry.id} />
        </div>
      )}

      {inquiry.convertedBookingId && (
        <Card className="bg-success-soft border-success/30">
          <p className="text-sm text-ink">
            This inquiry was converted.{" "}
            <Link
              href={`/bookings/${inquiry.convertedBookingId}`}
              className="font-medium text-accent hover:underline"
            >
              View booking →
            </Link>
          </p>
        </Card>
      )}

      {inquiry.closeReason && (
        <Card className="bg-danger-soft border-danger/30">
          <p className="text-sm text-ink">Closed: {inquiry.closeReason}</p>
        </Card>
      )}

      <Card>
        <CardHeader title="Customer" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink font-medium">{inquiry.customerName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink font-medium">{inquiry.customerPhone}</dd>
          </div>
          {inquiry.address?.line1 && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Service address</dt>
              <dd className="text-ink font-medium">
                {inquiry.address.line1}
                {inquiry.address.city ? `, ${inquiry.address.city}` : ""}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Call summary" />
        <p className="text-sm text-ink whitespace-pre-wrap">{inquiry.callSummary}</p>
      </Card>

      <Card>
        <CardHeader title="History" />
        <ul className="flex flex-col divide-y divide-border">
          {inquiry.history.map((event, index) => (
            <li key={index} className="py-2 text-sm">
              <p className="text-ink">{event.summary}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {event.actorName} · {formatDateTimeInBusinessZone(event.occurredAt, "PPp")}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
