import { google } from "googleapis";
import { EventRecord } from "./types";

const REQUIRED_HEADERS = [
  "Date",
  "Title",
  "IsSunday",
  "Speaker",
  "StaffGone",
  "IsCommunion",
  "Notes",
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

const parseBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "1", "true"].includes(normalized)) return true;
  if (["no", "n", "0", "false"].includes(normalized)) return false;
  return null;
};

export const fetchEventsFromSheet = async () => {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set");
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Events!A1:Z",
  });

  const rows = response.data.values ?? [];
  if (rows.length === 0) return [] as EventRecord[];

  const headerRow = rows[0].map((cell) => normalize(cell as string));
  const expectedHeaders = REQUIRED_HEADERS.join("|");
  const actualHeaders = headerRow.slice(0, REQUIRED_HEADERS.length).join("|");
  if (expectedHeaders !== actualHeaders) {
    throw new Error("Sheet headers do not match the required schema");
  }

  const indexMap = new Map<string, number>();
  headerRow.forEach((header, index) => {
    indexMap.set(header, index);
  });

  const events: EventRecord[] = [];

  for (const row of rows.slice(1)) {
    const get = (header: (typeof REQUIRED_HEADERS)[number]) => {
      const index = indexMap.get(header);
      if (index === undefined) return "";
      return normalize(row[index] as string | undefined);
    };

    const date = get("Date");
    const title = get("Title");
    const isSundayRaw = get("IsSunday");
    const isCommunionRaw = get("IsCommunion");

    if (!date || !title || !isSundayRaw || !isCommunionRaw) continue;

    const isSunday = parseBoolean(isSundayRaw);
    const isCommunion = parseBoolean(isCommunionRaw);
    if (isSunday === null || isCommunion === null) continue;

    events.push({
      date,
      title,
      isSunday,
      speaker: normalize(get("Speaker")) || undefined,
      staffGone: normalize(get("StaffGone")) || undefined,
      isCommunion,
      notes: normalize(get("Notes")) || undefined,
    });
  }

  return events;
};
