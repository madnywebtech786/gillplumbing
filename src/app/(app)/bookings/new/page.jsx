import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getInquiryForActor } from "@/server/services/inquiryService";
import { Card, CardHeader } from "@/components/ui/Card";
import { NewBookingForm } from "@/components/forms/NewBookingForm";
import { ConvertInquiryForm } from "@/components/forms/ConvertInquiryForm";
import { INQUIRY_STATUS } from "@/constants/statuses";

export default async function NewBookingPage({ searchParams }) {
  const actor = await requireUser();
  const { inquiryId } = await searchParams;

  if (inquiryId) {
    const inquiry = await getInquiryForActor(inquiryId, actor);
    if (!inquiry) {
      notFound();
    }
    if (inquiry.status === INQUIRY_STATUS.CONVERTED || inquiry.status === INQUIRY_STATUS.CLOSED) {
      notFound();
    }

    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader
            title="Convert inquiry to booking"
            description={`${inquiry.customerSnapshot?.name} · ${inquiry.customerSnapshot?.phone}`}
          />
          <ConvertInquiryForm inquiryId={inquiryId} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader title="New booking" />
        <NewBookingForm />
      </Card>
    </div>
  );
}
