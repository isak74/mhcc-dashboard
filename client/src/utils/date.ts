import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const TIME_ZONE = "America/New_York";

export const getDefaultRange = () => {
  const now = new Date();
  const zoned = toZonedTime(now, TIME_ZONE);
  const start = format(zoned, "yyyy-MM-dd");
  const end = format(addDays(zoned, 30), "yyyy-MM-dd");
  return { start, end };
};

export const formatDisplayDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const isValidDate = (value: string | undefined): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
