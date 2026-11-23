import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { Card } from "@/components/ui/Card";
import { NewInquiryForm } from "@/components/forms/NewInquiryForm";

export default async function NewInquiryPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div>
        <Link href="/inquiries" className="text-sm text-ink-muted hover:text-ink">
          ← Back to inquiries
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink mt-2">
          New inquiry
        </h1>
      </div>
      <Card>
        <NewInquiryForm />
      </Card>
    </div>
  );
}
