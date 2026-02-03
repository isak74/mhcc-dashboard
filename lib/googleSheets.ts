import { google } from "googleapis";
import { EventRecord, EventType } from "./types";

const REQUIRED_HEADERS = [
  "Date",
  "Title",
  "EventType",
  "SermonSeries",
  "Speaker",
  "StaffGone",
  "SpecialNotes",
] as const;

const getAuthClient = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    throw new Error("Google service account credentials are not set");
  }
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
};

const normalize = (value: string | undefined) => value?.trim() ?? "";

const isEventType = (value: string): value is EventType =>
  value === "Sunday" || value === "Other";

export const fetchEventsFromSheet = async () => {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set");
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Events!A:G",
  });

  const rows = response.data.values ?? [];
  if (rows.length === 0) return [] as EventRecord[];

  const headerRow = rows[0].map((cell) => normalize(cell as string));
  const indexMap = new Map<string, number>();
  headerRow.forEach((header, index) => {
    indexMap.set(header, index);
  });

  for (const header of REQUIRED_HEADERS) {
    if (!indexMap.has(header)) {
      throw new Error(`Missing header column: ${header}`);
    }
  }

  const events: EventRecord[] = [];

  for (const row of rows.slice(1)) {
    const get = (header: (typeof REQUIRED_HEADERS)[number]) => {
      const index = indexMap.get(header);
      if (index === undefined) return "";
      return normalize(row[index] as string | undefined);
    };

    const date = get("Date");
    const title = get("Title");
    const eventTypeRaw = get("EventType");

    if (!date || !title || !eventTypeRaw) continue;
    if (!isEventType(eventTypeRaw)) continue;

    const event: EventRecord = {
      date,
      title,
      eventType: eventTypeRaw,
      sermonSeries: normalize(get("SermonSeries")) || undefined,
      speaker: normalize(get("Speaker")) || undefined,
      staffGone: normalize(get("StaffGone")) || undefined,
      specialNotes: normalize(get("SpecialNotes")) || undefined,
    };

    events.push(event);
  }

  return events;
};
