"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Textarea, Select } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { saveOrSubmitJobReportAction, updateJobReportDraftAction } from "@/server/actions/jobReports";
import { getTodayDayKey } from "@/lib/dates/business-time";
import { JOB_REPORT_SOURCE } from "@/constants/statuses";
import { ALL_PAYMENT_METHODS } from "@/constants/payment-methods";

function minorToDecimalString(amountMinor) {
  if (!amountMinor) return "";
  return (amountMinor / 100).toFixed(2);
}

function IntentButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end gap-2 mt-2">
      <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save as draft"}
      </Button>
      <Button type="submit" name="intent" value="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit report"}
      </Button>
    </div>
  );
}

// Reused for both "Add Job Entry" (no report, posts to the save-or-submit
// action) and editing an own draft (report passed in, posts to the
// update-draft action and shows a single Save button instead of the
// draft/submit intent buttons - submitting happens separately from the
// detail page once the employee is done editing).
export function NewJobReportForm({ bookings, report }) {
  const isEditingDraft = Boolean(report);
  const boundAction = isEditingDraft
    ? updateJobReportDraftAction.bind(null, report.id)
    : saveOrSubmitJobReportAction;
  const [state, action] = useActionState(boundAction, undefined);
  // On a failed submission, re-populate what the user actually typed
  // (state.fields) instead of resetting to the original report/blank
  // values - defaultValue only applies on first mount, but useActionState
  // re-renders this same mounted form, so this takes effect correctly.
  const fields = state?.fields;
  const [source, setSource] = useState(
    fields?.source ?? report?.source ?? JOB_REPORT_SOURCE.BOOKING
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <ErrorState message={state.error} />}

      <FieldWrapper label="Job source">
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
          {[
            { value: JOB_REPORT_SOURCE.BOOKING, label: "Existing booking" },
            { value: JOB_REPORT_SOURCE.MANUAL, label: "Manual / Unbooked Job" },
          ].map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer px-3 py-1.5 font-medium transition-colors ${
                source === option.value
                  ? "bg-accent text-white shadow-sm"
                  : "bg-paper-raised text-ink-muted hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="source"
                value={option.value}
                checked={source === option.value}
                onChange={() => setSource(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </FieldWrapper>

      {source === JOB_REPORT_SOURCE.BOOKING ? (
        <FieldWrapper label="Booking" htmlFor="bookingId">
          <Select
            id="bookingId"
            name="bookingId"
            required
            defaultValue={fields?.bookingId ?? report?.bookingId ?? ""}
          >
            <option value="" disabled>
              Select a booking
            </option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingNumber} - {booking.customerName} - {booking.serviceName}
              </option>
            ))}
          </Select>
          {bookings.length === 0 && (
            <p className="text-xs text-ink-muted mt-1">No bookings yet. Use Manual / Unbooked Job instead.</p>
          )}
        </FieldWrapper>
      ) : (
        <>
          <FieldWrapper label="Customer name" htmlFor="customerName">
            <Input
              id="customerName"
              name="customerName"
              defaultValue={fields?.customerName ?? report?.customerName ?? ""}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Phone number (optional)" htmlFor="customerPhone">
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              defaultValue={fields?.customerPhone ?? report?.customerPhone ?? ""}
            />
          </FieldWrapper>
          <FieldWrapper label="Service address (optional)" htmlFor="addressLine1">
            <Input
              id="addressLine1"
              name="addressLine1"
              placeholder="Street address"
              defaultValue={fields?.addressLine1 ?? report?.address?.line1 ?? ""}
            />
          </FieldWrapper>
          <FieldWrapper label="City (optional)" htmlFor="addressCity">
            <Input
              id="addressCity"
              name="addressCity"
              defaultValue={fields?.addressCity ?? report?.address?.city ?? ""}
            />
          </FieldWrapper>
        </>
      )}

      <FieldWrapper label="Service performed" htmlFor="serviceSnapshot">
        <Input
          id="serviceSnapshot"
          name="serviceSnapshot"
          placeholder="e.g. Drain cleaning"
          defaultValue={fields?.serviceSnapshot ?? report?.serviceSnapshot ?? ""}
          required
        />
      </FieldWrapper>

      <FieldWrapper label="Work date" htmlFor="workDate">
        <DatePicker
          id="workDate"
          name="workDate"
          defaultValue={fields?.workDate ?? report?.workDate ?? getTodayDayKey()}
          required
        />
      </FieldWrapper>

      <FieldWrapper label="Work summary (required to submit)" htmlFor="workSummary">
        <Textarea
          id="workSummary"
          name="workSummary"
          rows={3}
          defaultValue={fields?.workSummary ?? report?.workSummary ?? ""}
        />
      </FieldWrapper>

      <FieldWrapper label="Internal notes (optional)" htmlFor="internalNotes">
        <Textarea
          id="internalNotes"
          name="internalNotes"
          rows={2}
          defaultValue={fields?.internalNotes ?? report?.internalNotes ?? ""}
        />
      </FieldWrapper>

      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper label="Total billed amount" htmlFor="billedAmount">
          <Input
            id="billedAmount"
            name="billedAmount"
            placeholder="0.00"
            defaultValue={fields?.billedAmount ?? minorToDecimalString(report?.draftBilledAmountMinor)}
          />
        </FieldWrapper>
        <FieldWrapper label="Amount received" htmlFor="amountReceived">
          <Input
            id="amountReceived"
            name="amountReceived"
            placeholder="0.00"
            defaultValue={fields?.amountReceived ?? minorToDecimalString(report?.draftReceivedAmountMinor)}
          />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Payment method (required if an amount was received)" htmlFor="paymentMethod">
        <Select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue={fields?.paymentMethod ?? report?.draftPaymentMethod ?? ""}
        >
          <option value="">None</option>
          {ALL_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </FieldWrapper>

      <FieldWrapper label="Payment reference (optional)" htmlFor="paymentReference">
        <Input
          id="paymentReference"
          name="paymentReference"
          defaultValue={fields?.paymentReference ?? report?.draftPaymentReference ?? ""}
        />
      </FieldWrapper>

      {isEditingDraft ? (
        <div className="flex justify-end mt-2">
          <SubmitButton pendingLabel="Saving...">Save draft</SubmitButton>
        </div>
      ) : (
        <IntentButtons />
      )}
    </form>
  );
}
