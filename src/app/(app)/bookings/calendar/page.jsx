import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { Button } from "@/components/ui/Button";
import { BookingCalendar } from "@/components/bookings/BookingCalendar";

export default async function BookingsCalendarPage() {
  const actor = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Calendar</h1>
          <p className="text-sm text-ink-muted mt-1">
            {actor.role === "ADMIN" ? "All scheduled jobs." : "Jobs assigned to you."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings">
            <Button variant="secondary">List view</Button>
          </Link>
          <Link href="/bookings/new">
            <Button>New booking</Button>
          </Link>
        </div>
      </div>

      <BookingCalendar />
    </div>
  );
}
