"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BUSINESS_TIME_ZONE } from "@/lib/dates/business-time";
import { BOOKING_STATUS_DISPLAY } from "@/lib/status-display";

function renderEventContent(eventInfo) {
  const { event, timeText } = eventInfo;
  const { serviceName, customerName, assignedEmployeeNames } = event.extendedProps;

  return (
    <div className="fc-event-tile">
      <div className="fc-event-tile-top">
        {timeText && <span className="fc-event-tile-time">{timeText}</span>}
        <span className="fc-event-tile-service">{serviceName}</span>
      </div>
      <div className="fc-event-tile-customer">
        {customerName}
        {assignedEmployeeNames?.length > 0 && (
          <span className="fc-event-tile-assignee"> · {assignedEmployeeNames[0]}</span>
        )}
      </div>
    </div>
  );
}

export function BookingCalendar() {
  const router = useRouter();
  const calendarRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  function handleEventClick(clickInfo) {
    const { event } = clickInfo;
    setSelectedEvent({
      id: event.id,
      start: event.start,
      serviceName: event.extendedProps.serviceName,
      customerName: event.extendedProps.customerName,
      status: event.extendedProps.status,
      statusLabel: event.extendedProps.statusLabel,
      assignedEmployeeNames: event.extendedProps.assignedEmployeeNames,
      bookingNumber: event.extendedProps.bookingNumber,
    });
  }

  return (
    <div className="calendar-shell rounded-lg border border-border bg-paper-raised p-3 sm:p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        timeZone={BUSINESS_TIME_ZONE}
        height="auto"
        events={async (info, successCallback, failureCallback) => {
          try {
            const params = new URLSearchParams({
              start: info.startStr,
              end: info.endStr,
            });
            const response = await fetch(`/api/bookings/calendar-feed?${params}`);
            if (!response.ok) throw new Error("Failed to load bookings.");
            const events = await response.json();
            successCallback(events);
          } catch (error) {
            failureCallback(error);
          }
        }}
        eventClick={handleEventClick}
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        eventContent={renderEventContent}
        dayMaxEvents={3}
      />

      <Dialog
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.bookingNumber}
        description={selectedEvent ? `${selectedEvent.serviceName} — ${selectedEvent.customerName}` : undefined}
      >
        {selectedEvent && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-ink-muted">Status</dt>
                <dd className="mt-0.5">
                  <Badge tone={BOOKING_STATUS_DISPLAY[selectedEvent.status]?.tone}>
                    {selectedEvent.statusLabel}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Assigned to</dt>
                <dd className="text-ink font-medium">
                  {selectedEvent.assignedEmployeeNames?.length > 0
                    ? selectedEvent.assignedEmployeeNames.join(", ")
                    : "Unassigned"}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <Button onClick={() => router.push(`/bookings/${selectedEvent.id}`)}>
                View full booking
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
