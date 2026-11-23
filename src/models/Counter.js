import mongoose from "mongoose";

// Backing store for generating sequential human-friendly reference numbers
// (bookingNumber, inquiryNumber, jobReportNumber, transactionNumber).
const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  sequence: { type: Number, required: true, default: 0 },
});

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
