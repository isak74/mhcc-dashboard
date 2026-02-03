import { EventRecord } from "../lib/types";
import { formatEventDate } from "../lib/date";

const renderSundayMeta = (event: EventRecord) => {
  const parts = [event.sermonSeries, event.speaker].filter(Boolean).join(" • ");
  return parts ? <div className="highlight">{parts}</div> : null;
};

export const EventList = ({ events }: { events: EventRecord[] }) => {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      {events.map((event) => (
        <div
          key={`${event.date}-${event.title}`}
          className={`event ${event.eventType === "Other" ? "other" : ""}`}
        >
          <div className="date">{formatEventDate(event.date)}</div>
          <div className="title">{event.title}</div>
          {event.eventType === "Other" ? (
            <span className="badge">Other event</span>
          ) : (
            renderSundayMeta(event)
          )}
          {event.eventType === "Sunday" && (event.staffGone || event.specialNotes) ? (
            <div className="meta">
              {event.staffGone ? `Staff gone: ${event.staffGone}` : null}
              {event.staffGone && event.specialNotes ? " · " : null}
              {event.specialNotes ? `Notes: ${event.specialNotes}` : null}
            </div>
          ) : null}
          {event.eventType === "Other" && (event.staffGone || event.specialNotes) ? (
            <div className="meta">
              {event.staffGone ? `Staff gone: ${event.staffGone}` : null}
              {event.staffGone && event.specialNotes ? " · " : null}
              {event.specialNotes ? `Notes: ${event.specialNotes}` : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
