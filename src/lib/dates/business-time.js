import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// V1 default confirmed with the client: Calgary, Canada. Calgary has no
// IANA zone of its own; America/Edmonton is the correct zone for it
// (both are Mountain Time, same DST rules).
export const BUSINESS_TIME_ZONE = "America/Edmonton";
export const BUSINESS_CURRENCY_CODE = "CAD";

const DAY_KEY_FORMAT = "yyyy-MM-dd";

// "Today" as a YYYY-MM-DD day key in the business timezone, not the server
// or device timezone (spec 13.1).
export function getTodayDayKey() {
  return formatInTimeZone(new Date(), BUSINESS_TIME_ZONE, DAY_KEY_FORMAT);
}

export function toDayKey(date) {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, DAY_KEY_FORMAT);
}

// Converts a business-local YYYY-MM-DD + HH:mm pair into a UTC Date instant
// for storage (used for booking scheduledStartAt).
export function zonedDateTimeToUtc(dayKey, timeString) {
  const localString = `${dayKey}T${timeString}:00`;
  return fromZonedTime(localString, BUSINESS_TIME_ZONE);
}

export function formatDateTimeInBusinessZone(date, formatString = "PPpp") {
  return formatInTimeZone(date, BUSINESS_TIME_ZONE, formatString);
}

export function dayKeyRangeToUtc(startDayKey, endDayKey) {
  const start = fromZonedTime(`${startDayKey}T00:00:00`, BUSINESS_TIME_ZONE);
  const end = fromZonedTime(`${endDayKey}T23:59:59.999`, BUSINESS_TIME_ZONE);
  return { start, end };
}
