"use client";

import { useRef, useState, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldWrapper, Input, Select } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorState } from "@/components/ui/States";
import { addPaymentAction } from "@/server/actions/ledger";
import { ALL_PAYMENT_METHODS } from "@/constants/payment-methods";
import { formatMinor } from "@/lib/money";

export function AddPaymentDialog({ jobReportId, outstandingBalanceMinor, currencyCode }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef(null);
  const boundAction = addPaymentAction.bind(null, jobReportId);
  const [state, action] = useActionState(boundAction, undefined);

  if (state?.success && open) {
    setOpen(false);
    formRef.current?.reset();
  }

  const maxAmount = (outstandingBalanceMinor / 100).toFixed(2);

  function handleClose() {
    setOpen(false);
    // Only clear the form on a successful close/cancel - a failed submission
    // should keep what the user typed (state.fields already repopulates it
    // via defaultValue on next render, but reset() would wipe that out if
    // the dialog is closed and reopened without an intervening success).
    if (!state?.error) {
      formRef.current?.reset();
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add payment
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Add payment"
        description={`Record a payment received for this job report. Outstanding balance: ${formatMinor(outstandingBalanceMinor, currencyCode)}.`}
      >
        <form ref={formRef} action={action} className="flex flex-col gap-4">
          {state?.error && <ErrorState message={state.error} />}
          <FieldWrapper
            label="Amount"
            htmlFor="amount"
            hint={`Cannot exceed the outstanding balance of ${formatMinor(outstandingBalanceMinor, currencyCode)}.`}
          >
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              max={maxAmount}
              step="0.01"
              placeholder="0.00"
              defaultValue={state?.fields?.amount ?? ""}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Payment method" htmlFor="paymentMethod">
            <Select
              id="paymentMethod"
              name="paymentMethod"
              required
              defaultValue={state?.fields?.paymentMethod ?? ""}
            >
              <option value="" disabled>
                Select a method
              </option>
              {ALL_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Reference (optional)" htmlFor="reference">
            <Input id="reference" name="reference" defaultValue={state?.fields?.reference ?? ""} />
          </FieldWrapper>
          <FieldWrapper label="Note (optional)" htmlFor="note">
            <Input id="note" name="note" defaultValue={state?.fields?.note ?? ""} />
          </FieldWrapper>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving...">Add payment</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
