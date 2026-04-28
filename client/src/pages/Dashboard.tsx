import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { DateRangePicker } from "../components/DateRangePicker";
import { EventList } from "../components/EventList";
import { EventRecord } from "../types";
import { getDefaultRange, isValidDate } from "../utils/date";
import { CommunionIcon } from "../components/CommunionIcon";

const RANGE_KEY = "mhcc-dashboard-range";
const DISPLAY_KEY = "mhcc-dashboard-display";

type DisplayMode = "auto" | "1" | "2" | "3";

const parseDisplayMode = (value: string | null): DisplayMode | null => {
  if (value === "tv") return "3";
  if (value === "auto" || value === "1" || value === "2" || value === "3") return value;
  return null;
};

const getInitialDisplayMode = (): DisplayMode => {
  const params = new URLSearchParams(window.location.search);
  const urlMode = parseDisplayMode(params.get("display"));
  if (urlMode) return urlMode;

  return parseDisplayMode(window.localStorage.getItem(DISPLAY_KEY)) ?? "auto";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getAutoColumnCount = (width: number) => {
  const gap = 18;
  const minColumnWidth = 380;
  const maxColumns = 4;

  if (width < 720) return 1;

  return clamp(Math.floor((width + gap) / (minColumnWidth + gap)), 1, maxColumns);
};

const getVisibleColumnCount = (width: number, displayMode: DisplayMode) => {
  const autoColumns = getAutoColumnCount(width);
  if (displayMode === "auto") return autoColumns;

  return Math.min(autoColumns, Number(displayMode));
};

const getTargetEventsPerColumn = (height: number) => {
  const reservedHeight = 190;
  const estimatedEventHeight = 132;
  const availableHeight = Math.max(360, height - reservedHeight);

  return Math.max(3, Math.floor(availableHeight / estimatedEventHeight));
};

const splitEventsIntoColumns = (events: EventRecord[], columnCount: number) => {
  if (events.length === 0) return [];

  const chunkSize = Math.ceil(events.length / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    events.slice(index * chunkSize, (index + 1) * chunkSize),
  ).filter((column) => column.length > 0);
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState("Loading events...");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(getInitialDisplayMode);
  const [layoutWidth, setLayoutWidth] = useState(window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
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
    const handleResize = () => {
      setLayoutWidth(layoutRef.current?.clientWidth ?? window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    if (!layoutRef.current || typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver(([entry]) => {
      setLayoutWidth(entry.contentRect.width);
      setViewportHeight(window.innerHeight);
    });
    observer.observe(layoutRef.current);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [events.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!range) return;

    const params = new URLSearchParams(window.location.search);
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

  const handleDisplayModeChange = (nextMode: DisplayMode) => {
    setDisplayMode(nextMode);
    window.localStorage.setItem(DISPLAY_KEY, nextMode);

    const params = new URLSearchParams(window.location.search);
    if (nextMode === "auto") {
      params.delete("display");
    } else {
      params.set("display", nextMode);
    }
    window.history.replaceState({}, "", `/?${params.toString()}`);
  };

  const handleFullscreen = async () => {
    if (!document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Some iframe hosts block fullscreen even when the API exists.
    }
  };

  const updateScrollButtons = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 2);
    setCanScrollRight(rail.scrollLeft < maxScrollLeft - 2);
  }, []);

  const handleColumnScroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const firstColumn = rail.querySelector<HTMLElement>(".event-list");
    const styles = window.getComputedStyle(rail);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const columnWidth = firstColumn?.getBoundingClientRect().width ?? rail.clientWidth;

    rail.scrollBy({ left: direction * (columnWidth + gap), behavior: "smooth" });
    window.setTimeout(updateScrollButtons, 350);
  };

  const visibleColumns = useMemo(
    () => getVisibleColumnCount(layoutWidth, displayMode),
    [displayMode, layoutWidth],
  );

  const targetEventsPerColumn = useMemo(
    () => getTargetEventsPerColumn(viewportHeight),
    [viewportHeight],
  );

  const columns = useMemo(() => {
    const totalColumns = Math.min(
      events.length,
      Math.max(visibleColumns, Math.ceil(events.length / targetEventsPerColumn)),
    );
    return splitEventsIntoColumns(events, totalColumns);
  }, [events, targetEventsPerColumn, visibleColumns]);

  const columnsInView = Math.max(1, Math.min(visibleColumns, columns.length));

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollTo({ left: 0 });
    window.requestAnimationFrame(updateScrollButtons);
  }, [columns.length, displayMode, updateScrollButtons, visibleColumns]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    rail.addEventListener("scroll", updateScrollButtons, { passive: true });

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => updateScrollButtons());
    observer?.observe(rail);

    updateScrollButtons();

    return () => {
      rail.removeEventListener("scroll", updateScrollButtons);
      observer?.disconnect();
    };
  }, [columns.length, updateScrollButtons]);

  if (!range) {
    return (
      <main className="dashboard">
        <div className="card">Loading date range...</div>
      </main>
    );
  }

  return (
    <main className={`dashboard dashboard-${displayMode}`} data-display-mode={displayMode}>
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
          displayMode={displayMode}
          onDisplayModeChange={handleDisplayModeChange}
          onToggleFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
          canFullscreen={document.fullscreenEnabled}
        />
      </div>
      {status ? <div className="status">{status}</div> : null}
      {events.length === 0 ? (
        <div className="card">No events in this range.</div>
      ) : (
        <div className="column-frame" ref={layoutRef}>
          {canScrollLeft ? (
            <button
              type="button"
              className="column-arrow column-arrow-left"
              aria-label="Show previous columns"
              onClick={() => handleColumnScroll(-1)}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
          ) : null}
          <div
            className="column-rail"
            ref={railRef}
            style={{ "--visible-columns": columnsInView } as CSSProperties}
          >
            {columns.map((column, index) => (
              <EventList key={index} events={column} />
            ))}
          </div>
          {canScrollRight ? (
            <button
              type="button"
              className="column-arrow column-arrow-right"
              aria-label="Show next columns"
              onClick={() => handleColumnScroll(1)}
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          ) : null}
        </div>
      )}
    </main>
  );
};
