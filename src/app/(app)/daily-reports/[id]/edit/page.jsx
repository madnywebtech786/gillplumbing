import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getJobReportDetailForActor } from "@/server/queries/jobReports";
import { getBookingsListForActor } from "@/server/queries/bookings";
import { Card, CardHeader } from "@/components/ui/Card";
import { NewJobReportForm } from "@/components/forms/NewJobReportForm";
import { JOB_REPORT_STATUS } from "@/constants/statuses";

export default async function EditJobReportPage({ params }) {
  const actor = await requireUser();
  const { id } = await params;

  const report = await getJobReportDetailForActor(id, actor);
  // Drafts are edited only by the employee who owns them, not admin - the
  // permission matrix lists "edit own draft" per-role, not an admin
  // override, matching jobReportService.loadOwnDraftOrThrow.
  if (!report || report.status !== JOB_REPORT_STATUS.DRAFT || report.performedById !== actor.id) {
    notFound();
  }

  const bookings = await getBookingsListForActor(actor);

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader title="Edit draft" description={report.jobReportNumber} />
        <NewJobReportForm bookings={bookings} report={report} />
      </Card>
    </div>
  );
}
