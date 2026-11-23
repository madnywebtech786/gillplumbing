import mongoose from "mongoose";
import { ALL_LEDGER_TRANSACTION_TYPES } from "@/constants/statuses";
import { ALL_PAYMENT_METHODS } from "@/constants/payment-methods";

const LedgerTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: {
      name: { type: String },
      phone: { type: String },
    },
    jobReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobReport",
      required: true,
    },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    type: { type: String, enum: ALL_LEDGER_TRANSACTION_TYPES, required: true },
    // Positive increases the customer's balance owed, negative reduces it.
    signedAmountMinor: { type: Number, required: true },
    currencyCode: { type: String, required: true },
    paymentMethod: { type: String, enum: ALL_PAYMENT_METHODS },
    reference: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    occurredAt: { type: Date, required: true, default: Date.now },
    postedAt: { type: Date, required: true, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reversesTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerTransaction",
    },
    relatedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerTransaction",
    },
  },
  { timestamps: true }
);

LedgerTransactionSchema.index({ jobReportId: 1, occurredAt: 1 });
LedgerTransactionSchema.index({ customerId: 1, occurredAt: 1 });
LedgerTransactionSchema.index({ type: 1, occurredAt: 1 });
LedgerTransactionSchema.index({ recordedBy: 1, occurredAt: 1 });

export default mongoose.models.LedgerTransaction ||
  mongoose.model("LedgerTransaction", LedgerTransactionSchema);
