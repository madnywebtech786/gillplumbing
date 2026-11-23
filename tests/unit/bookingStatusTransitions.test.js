import { describe, expect, it } from "vitest";
import { BOOKING_STATUS, BOOKING_STATUS_TRANSITIONS } from "@/constants/statuses";

describe("booking status transitions (spec 12.3)", () => {
  it("allows transitioning out of every active status into CANCELLED", () => {
    for (const status of [
      BOOKING_STATUS.SCHEDULED,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.COMPLETED,
    ]) {
      expect(BOOKING_STATUS_TRANSITIONS[status]).toContain(BOOKING_STATUS.CANCELLED);
    }
  });

  it("allows no transitions at all out of CANCELLED", () => {
    expect(BOOKING_STATUS_TRANSITIONS[BOOKING_STATUS.CANCELLED]).toEqual([]);
  });

  it("never lists a status as transitioning into itself", () => {
    for (const [status, allowed] of Object.entries(BOOKING_STATUS_TRANSITIONS)) {
      expect(allowed).not.toContain(status);
    }
  });
});
