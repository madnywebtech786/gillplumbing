import mongoose from "mongoose";
import { ALL_INQUIRY_STATUSES, INQUIRY_STATUS } from "@/constants/statuses";
import {
  AddressSnapshotSchema,
  CustomerSnapshotSchema,
} from "@/models/shared/addressSnapshot";

const HistoryEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    summary: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    occurredAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const InquirySchema = new mongoose.Schema(
  {
    inquiryNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: { type: CustomerSnapshotSchema, required: true },
    serviceAddressSnapshot: { type: AddressSnapshotSchema },
    callSummary: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ALL_INQUIRY_STATUSES,
      default: INQUIRY_STATUS.NEW,
    },
    followUpAt: { type: Date },
    internalNote: { type: String, trim: true },
    closeReason: { type: String, trim: true },
    convertedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    history: { type: [HistoryEventSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

InquirySchema.index({ status: 1, createdAt: -1 });
InquirySchema.index({ customerId: 1, createdAt: -1 });
InquirySchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
