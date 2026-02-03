import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TIME_ZONE = "America/New_York";

export const formatEventDate = (dateStr: string) => {
  const zoned = fromZonedTime(`${dateStr}T00:00:00`, TIME_ZONE);
  return formatInTimeZone(zoned, TIME_ZONE, "EEE, MMM d, yyyy");
};
