import mongoose from "mongoose";
import { ALL_BOOKING_STATUSES, BOOKING_STATUS } from "@/constants/statuses";
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

const BookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: { type: CustomerSnapshotSchema, required: true },
    serviceAddressSnapshot: { type: AddressSnapshotSchema },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
    serviceName: { type: String, required: true, trim: true },
    serviceDescription: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    scheduledStartAt: { type: Date, required: true },
    expectedDurationMinutes: { type: Number, min: 1 },
    assignedEmployeeIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    status: {
      type: String,
      enum: ALL_BOOKING_STATUSES,
      default: BOOKING_STATUS.SCHEDULED,
    },
    cancelReason: { type: String, trim: true },
    history: { type: [HistoryEventSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BookingSchema.index({ scheduledStartAt: 1, status: 1 });
BookingSchema.index({ assignedEmployeeIds: 1, scheduledStartAt: 1 });
BookingSchema.index({ customerId: 1, scheduledStartAt: 1 });
BookingSchema.index({ inquiryId: 1 });

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
