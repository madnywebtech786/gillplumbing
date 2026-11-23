import mongoose from "mongoose";

export const AddressSnapshotSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    regionOrState: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
    accessNotes: { type: String, trim: true },
  },
  { _id: false }
);

export const CustomerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);
