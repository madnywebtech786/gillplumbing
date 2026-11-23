import "server-only";
import Counter from "@/models/Counter";

const PREFIXES = {
  inquiry: "INQ",
  booking: "BKG",
  jobReport: "JOB",
  transaction: "TXN",
};

// Atomically increments a named counter and returns the next value,
// formatted as a human-friendly reference (e.g. "BKG-000042"). Safe under
// concurrent requests because findOneAndUpdate with $inc is atomic.
export async function nextReferenceNumber(counterName, session) {
  const prefix = PREFIXES[counterName];
  if (!prefix) {
    throw new Error(`Unknown counter: ${counterName}`);
  }

  const counter = await Counter.findOneAndUpdate(
    { key: counterName },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after", session }
  );

  return `${prefix}-${String(counter.sequence).padStart(6, "0")}`;
}
