import type { NextApiRequest, NextApiResponse } from "next";
import { fetchEventsFromSheet } from "../../lib/googleSheets";
import { EventRecord } from "../../lib/types";
import { parseCookieHeader, verifySessionToken } from "../../lib/auth";

const CACHE_TTL_MS = 30000;
let cachedEvents: EventRecord[] | null = null;
let cachedAt = 0;

const isValidDate = (value: string | undefined): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

const ensureAuthenticated = async (req: NextApiRequest) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  const token = cookies.session;
  if (!token) return false;
  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
};

const getCachedEvents = async () => {
  const now = Date.now();
  if (cachedEvents && now - cachedAt < CACHE_TTL_MS) {
    return cachedEvents;
  }
  const events = await fetchEventsFromSheet();
  cachedEvents = events;
  cachedAt = now;
  return events;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authed = await ensureAuthenticated(req);
  if (!authed) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const start = Array.isArray(req.query.start) ? req.query.start[0] : req.query.start;
  const end = Array.isArray(req.query.end) ? req.query.end[0] : req.query.end;

  if (!isValidDate(start) || !isValidDate(end)) {
    res.status(400).json({ message: "Invalid date range" });
    return;
  }
  if (start > end) {
    res.status(400).json({ message: "Start date must be before end date" });
    return;
  }

  try {
    const events = await getCachedEvents();
    const filtered = events
      .filter((event) => event.date >= start && event.date <= end)
      .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)));

    res.status(200).json({ events: filtered });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message ?? \"Failed to load events\" });
  }
}
