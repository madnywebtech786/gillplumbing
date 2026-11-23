import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import Customer from "@/models/Customer";

// No customer search UI in V1 (confirmed with client - inquiries/bookings
// are often one-time customers). We still link a Customer record by exact
// phone match so ledger/customer-balance aggregation works later without
// a data backfill. Creation is silent - no extra step for the employee.
export async function findOrCreateCustomerByPhone({ name, phone, email, createdBy }, session) {
  await connectToDatabase();

  const normalizedPhone = phone?.trim();

  if (normalizedPhone) {
    const existing = await Customer.findOne({ phone: normalizedPhone }).session(session ?? null);
    if (existing) {
      return existing;
    }
  }

  const customer = await Customer.create(
    [
      {
        name,
        phone: normalizedPhone || undefined,
        email: email || undefined,
        createdBy,
      },
    ],
    { session }
  );

  return customer[0];
}
