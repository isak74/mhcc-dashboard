export type EventType = "Sunday" | "Other";

export type EventRecord = {
  date: string; // YYYY-MM-DD
  title: string;
  eventType: EventType;
  sermonSeries?: string;
  speaker?: string;
  staffGone?: string;
  specialNotes?: string;
};
