import { describe, expect, it } from "vitest";
import {
  BUSINESS_TIME_ZONE,
  toDayKey,
  zonedDateTimeToUtc,
  dayKeyRangeToUtc,
} from "@/lib/dates/business-time";

describe("business timezone", () => {
  it("is a real IANA zone, not UTC or a hardcoded unrelated region", () => {
    expect(BUSINESS_TIME_ZONE).toBe("America/Edmonton");
  });
});

describe("zonedDateTimeToUtc / toDayKey round-trip", () => {
  it("converts a business-local date/time to the correct UTC instant", () => {
    // Mid-winter (Mountain Standard Time, UTC-7, no DST): 09:00 MST on a
    // November day is 16:00 UTC.
    const utc = zonedDateTimeToUtc("2026-11-20", "09:00");
    expect(utc.toISOString()).toBe("2026-11-20T16:00:00.000Z");
  });

  it("maps back to the same business-local day key", () => {
    const utc = zonedDateTimeToUtc("2026-11-20", "09:00");
    expect(toDayKey(utc)).toBe("2026-11-20");
  });

  it("does not silently reinterpret a late-evening local time into the next UTC day without accounting for the offset", () => {
    // 23:00 MST on Nov 20 is 06:00 UTC on Nov 21 - the UTC day key differs
    // from the business day key, which is exactly the boundary mismatch
    // spec 13.1 warns about if local/UTC day keys are mixed carelessly.
    const utc = zonedDateTimeToUtc("2026-11-20", "23:00");
    expect(utc.toISOString()).toBe("2026-11-21T06:00:00.000Z");
    expect(toDayKey(utc)).toBe("2026-11-20");
  });
});

describe("daylight saving transition (spec 13.1)", () => {
  it("applies MDT (UTC-6) after the spring-forward transition", () => {
    // America/Edmonton moves to MDT on the second Sunday in March. 2026-03-15
    // is after that transition.
    const utc = zonedDateTimeToUtc("2026-03-15", "09:00");
    expect(utc.toISOString()).toBe("2026-03-15T15:00:00.000Z");
  });

  it("applies MST (UTC-7) before the spring-forward transition", () => {
    const utc = zonedDateTimeToUtc("2026-03-01", "09:00");
    expect(utc.toISOString()).toBe("2026-03-01T16:00:00.000Z");
  });

  it("keeps the same business day key across the fall-back transition boundary", () => {
    // 2026-11-01 is the fall-back day for America/Edmonton (first Sunday in
    // November). A booking at 09:00 local that day must still map back to
    // the same local day key despite the offset change.
    const utc = zonedDateTimeToUtc("2026-11-01", "09:00");
    expect(toDayKey(utc)).toBe("2026-11-01");
  });
});

describe("dayKeyRangeToUtc", () => {
  it("spans from local midnight to local end-of-day for a single day key", () => {
    const { start, end } = dayKeyRangeToUtc("2026-11-20", "2026-11-20");
    expect(toDayKey(start)).toBe("2026-11-20");
    expect(toDayKey(end)).toBe("2026-11-20");
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});
