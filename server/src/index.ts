import express from "express";
import path from "node:path";
import { createHash } from "node:crypto";
import { format, addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { authMiddleware, clearSessionCookie, hasValidSession, setSessionCookie, signSessionToken } from "./auth";
import { fetchEventsFromSheet } from "./googleSheets";
import { EventRecord } from "./types";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const TIME_ZONE = "America/New_York";

const CACHE_TTL_MS = 30000;
let cachedEvents: EventRecord[] | null = null;
let cachedAt = 0;
let cachedEtag = "";

const getDefaultRange = () => {
  const now = new Date();
  const zoned = toZonedTime(now, TIME_ZONE);
  const start = format(zoned, "yyyy-MM-dd");
  const end = format(addDays(zoned, 30), "yyyy-MM-dd");
  return { start, end };
};

const isValidDate = (value: string | undefined): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getCachedEvents = async () => {
  const now = Date.now();
  if (cachedEvents && now - cachedAt < CACHE_TTL_MS) {
    return { events: cachedEvents, etag: cachedEtag };
  }
  const events = await fetchEventsFromSheet();
  const payload = JSON.stringify(events);
  cachedEvents = events;
  cachedAt = now;
  cachedEtag = createHash("sha1").update(payload).digest("hex");
  return { events, etag: cachedEtag };
};

app.use(express.json());

app.use("/api", (req, res, next) => {
  if (req.path === "/login") {
    next();
    return;
  }
  authMiddleware(req, res, next);
});

app.post("/api/login", async (req, res) => {
  const { password } = req.body ?? {};
  if (!password || typeof password !== "string") {
    res.status(400).json({ message: "Password is required" });
    return;
  }
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    res.status(500).json({ message: "APP_PASSWORD is not set" });
    return;
  }
  if (password !== expected) {
    res.status(401).json({ message: "Invalid password" });
    return;
  }

  const token = await signSessionToken();
  setSessionCookie(res, token);
  res.status(200).json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

app.get("/api/events", async (req, res) => {
  let start = typeof req.query.start === "string" ? req.query.start : undefined;
  let end = typeof req.query.end === "string" ? req.query.end : undefined;

  if (!isValidDate(start) || !isValidDate(end)) {
    const defaults = getDefaultRange();
    start = defaults.start;
    end = defaults.end;
  }

  if (start > end) {
    res.status(400).json({ message: "Start date must be before end date" });
    return;
  }

  try {
    const { events, etag } = await getCachedEvents();
    const filtered = events
      .filter((event) => event.date >= start! && event.date <= end!)
      .sort((a, b) => a.date.localeCompare(b.date));

    res.setHeader("ETag", etag);
    res.status(200).json({ events: filtered, etag });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message ?? "Failed to load events" });
  }
});

const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist, { index: false }));

app.get("/", async (req, res) => {
  const authed = await hasValidSession(req);
  if (!authed) {
    res.redirect("/login");
    return;
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.get("/*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
