import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateRangePicker } from "../components/DateRangePicker";
import { EventList } from "../components/EventList";
import { EventRecord } from "../types";
import { getDefaultRange, isValidDate } from "../utils/date";
import { CommunionIcon } from "../components/CommunionIcon";

const RANGE_KEY = "mhcc-dashboard-range";

export const Dashboard = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState("Loading events...");
  const lastPayload = useRef<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get("start") ?? undefined;
    const endParam = params.get("end") ?? undefined;

    if (isValidDate(startParam) && isValidDate(endParam)) {
      setRange({ start: startParam, end: endParam });
      return;
    }

    const stored = window.localStorage.getItem(RANGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { start?: string; end?: string };
        if (isValidDate(parsed.start) && isValidDate(parsed.end)) {
          setRange({ start: parsed.start, end: parsed.end });
          return;
        }
      } catch {
        // ignore
      }
    }

    setRange(getDefaultRange());
  }, []);

  const fetchEvents = async (nextRange: { start: string; end: string }) => {
    setStatus("Loading events...");
    try {
      const response = await fetch(`/api/events?start=${nextRange.start}&end=${nextRange.end}`);
      if (response.status === 401) {
        navigate("/login");
        return;
      }
      if (!response.ok) {
        setStatus("Failed to load events.");
        return;
      }
      const data = (await response.json()) as { events: EventRecord[]; etag?: string };
      const payload = JSON.stringify(data.events);
      if (payload !== lastPayload.current) {
        lastPayload.current = payload;
        setEvents(data.events);
      }
      setStatus("");
    } catch {
      setStatus("Failed to load events.");
    }
  };

  useEffect(() => {
    if (!range) return;

    const params = new URLSearchParams();
    params.set("start", range.start);
    params.set("end", range.end);
    window.history.replaceState({}, "", `/?${params.toString()}`);
    window.localStorage.setItem(RANGE_KEY, JSON.stringify(range));

    fetchEvents(range);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchEvents(range);
    }, 60000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [range?.start, range?.end]);

  const handleRefresh = () => {
    if (range) fetchEvents(range);
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    navigate("/login");
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
        <div>
          <h1>Service + Event Dashboard</h1>
          <div className="legend">
            <CommunionIcon /> Communion Sunday
          </div>
        </div>
        <DateRangePicker
          start={range.start}
          end={range.end}
          onChange={setRange}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      </div>
      {status ? <div className="status">{status}</div> : null}
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
};
