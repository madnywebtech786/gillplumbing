import { requireUser } from "@/lib/auth/dal";
import { getBookingsListForActor } from "@/server/queries/bookings";
import { Card, CardHeader } from "@/components/ui/Card";
import { NewJobReportForm } from "@/components/forms/NewJobReportForm";

export default async function NewJobReportPage() {
  const actor = await requireUser();
  const bookings = await getBookingsListForActor(actor);

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader
          title="Add Job Entry"
          description="Report work against an existing booking, or enter a manual / unbooked job."
        />
        <NewJobReportForm bookings={bookings} />
      </Card>
    </div>
  );
}
