import mongoose from "mongoose";
import {
  ALL_JOB_REPORT_SOURCES,
  ALL_JOB_REPORT_STATUSES,
  JOB_REPORT_STATUS,
} from "@/constants/statuses";
import {
  AddressSnapshotSchema,
  CustomerSnapshotSchema,
} from "@/models/shared/addressSnapshot";

const JobReportSchema = new mongoose.Schema(
  {
    jobReportNumber: { type: String, required: true, unique: true },
    source: { type: String, enum: ALL_JOB_REPORT_SOURCES, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: { type: CustomerSnapshotSchema, required: true },
    serviceAddressSnapshot: { type: AddressSnapshotSchema },
    serviceSnapshot: { type: String, required: true, trim: true },
    // Day key in business timezone, e.g. "2026-11-20". Chosen over a UTC
    // instant to avoid timezone-boundary bugs per spec 13.1.
    workDate: { type: String, required: true },
    workSummary: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    // Billing fields entered while the report is still a DRAFT, carried
    // forward so "Submit" on an existing draft (no new form data) posts the
    // amounts the employee actually typed rather than defaulting to zero.
    // Not the financial source of truth - submission re-validates and
    // snapshots the real figures into initialBilledAmountMinor + the ledger.
    draftBilledAmountMinor: { type: Number, min: 0 },
    draftReceivedAmountMinor: { type: Number, min: 0 },
    draftPaymentMethod: { type: String },
    draftPaymentReference: { type: String, trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ALL_JOB_REPORT_STATUSES,
      default: JOB_REPORT_STATUS.DRAFT,
    },
    submittedAt: { type: Date },
    voidedAt: { type: Date },
    voidReason: { type: String, trim: true },
    initialBilledAmountMinor: { type: Number, min: 0 },
    currencyCode: { type: String },
  },
  { timestamps: true }
);

JobReportSchema.index({ performedBy: 1, workDate: 1, status: 1 });
JobReportSchema.index({ bookingId: 1, workDate: 1 });
JobReportSchema.index({ customerId: 1, workDate: 1 });
JobReportSchema.index({ status: 1, workDate: 1 });

export default mongoose.models.JobReport || mongoose.model("JobReport", JobReportSchema);
