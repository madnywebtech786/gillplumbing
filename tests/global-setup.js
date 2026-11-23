import { MongoMemoryReplSet } from "mongodb-memory-server";

// Transactions require a replica set, which every mutation service here
// relies on (mongoose.startSession().withTransaction()), so a single-node
// MongoMemoryServer is not sufficient.
export default async function setup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await replSet.waitUntilRunning();

  process.env.MONGODB_URI = replSet.getUri();

  return async () => {
    await replSet.stop();
  };
}
