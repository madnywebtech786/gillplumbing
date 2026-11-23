import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";

beforeAll(async () => {
  await connectToDatabase();
});

// Each test starts from a clean database so financial/ownership assertions
// never depend on leftover state from a previous test.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
