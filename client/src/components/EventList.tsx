import { EventRecord } from "../types";
import { formatDisplayDate } from "../utils/date";
import { CommunionIcon } from "./CommunionIcon";

export const EventList = ({ events }: { events: EventRecord[] }) => {
  if (events.length === 0) return null;

  return (
    <div className="event-list">
      {events.map((event) => (
        <div
          key={`${event.date}-${event.title}`}
          className={`event ${event.isSunday ? "sunday" : "other"}`}
        >
          <div className="event-primary">
            <div className="date">{formatDisplayDate(event.date)}</div>
            <div className="title">
              {event.isSunday && event.isCommunion ? <CommunionIcon /> : null}
              {event.title}
            </div>
          </div>
          <div className="event-details">
            {event.speaker ? <div>Speaker: {event.speaker}</div> : null}
            {event.staffGone || event.notes ? (
              <div>
                {event.staffGone ? `Staff gone: ${event.staffGone}` : null}
                {event.staffGone && event.notes ? " · " : null}
                {event.notes ? `Notes: ${event.notes}` : null}
              </div>
            ) : null}
          </div>
          {event.isSunday ? (
            <span className="badge">Sunday</span>
          ) : (
            <span className="badge">Event</span>
          )}
        </div>
      ))}
    </div>
  );
};
