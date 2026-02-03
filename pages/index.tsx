import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { DateRangePicker } from "../components/DateRangePicker";
import { EventList } from "../components/EventList";
import { EventRecord } from "../lib/types";
import { TIME_ZONE } from "../lib/date";

const DATE_KEY = "calendar-dashboard-range";

const isValidDate = (value: string | undefined): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getDefaultRange = () => {
  const now = new Date();
  const zoned = toZonedTime(now, TIME_ZONE);
  const start = format(zoned, "yyyy-MM-dd");
  const end = format(addDays(zoned, 30), "yyyy-MM-dd");
  return { start, end };
};

export default function HomePage() {
  const router = useRouter();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState<string>("Loading events...");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    const startParam = Array.isArray(router.query.start) ? router.query.start[0] : router.query.start;
    const endParam = Array.isArray(router.query.end) ? router.query.end[0] : router.query.end;

    if (isValidDate(startParam) && isValidDate(endParam)) {
      setRange({ start: startParam, end: endParam });
      return;
    }

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(DATE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { start?: string; end?: string };
          if (isValidDate(parsed.start) && isValidDate(parsed.end)) {
            setRange({ start: parsed.start, end: parsed.end });
            return;
          }
        } catch {
          // ignore invalid cache
        }
      }
    }

    setRange(getDefaultRange());
  }, [router.isReady, router.query.start, router.query.end]);

  const fetchEvents = async (nextRange: { start: string; end: string }) => {
    setStatus("Loading events...");
    try {
      const response = await fetch(`/api/events?start=${nextRange.start}&end=${nextRange.end}`);
      if (!response.ok) {
        setStatus("Failed to load events.");
        return;
      }
      const data = (await response.json()) as { events: EventRecord[] };
      setEvents(data.events);
      setStatus("");
    } catch {
      setStatus("Failed to load events.");
    }
  };

  useEffect(() => {
    if (!range) return;
    router.replace(
      {
        pathname: "/",
        query: { start: range.start, end: range.end },
      },
      undefined,
      { shallow: true }
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem(DATE_KEY, JSON.stringify(range));
    }

    fetchEvents(range);

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchEvents(range);
    }, 60000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [range?.start, range?.end]);

  const handleRefresh = () => {
    if (range) fetchEvents(range);
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const columns = useMemo(() => {
    const mid = Math.ceil(events.length / 2);
    return [events.slice(0, mid), events.slice(mid)];
  }, [events]);

  if (!range) {
    return (
      <main>
        <div className="card">Loading date range...</div>
      </main>
    );
  }

  return (
    <main>
      <div className="header">
        <h1>Service + Event Dashboard</h1>
        <DateRangePicker
          start={range.start}
          end={range.end}
          onChange={setRange}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      </div>
      {status ? <p className="notice">{status}</p> : null}
      {events.length === 0 ? (
        <div className="card">No events in this range.</div>
      ) : (
        <div className="layout">
          <EventList events={columns[0]} />
          <EventList events={columns[1]} />
        </div>
      )}
    </main>
  );
}
