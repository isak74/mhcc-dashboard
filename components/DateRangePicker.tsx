import { ChangeEvent } from "react";

type Props = {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
  onRefresh: () => void;
  onLogout: () => void;
};

export const DateRangePicker = ({ start, end, onChange, onRefresh, onLogout }: Props) => {
  const handleChange = (key: "start" | "end") => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ start: key === "start" ? event.target.value : start, end: key === "end" ? event.target.value : end });
  };

  return (
    <div className="controls">
      <label>
        Start date
        <input type="date" value={start} onChange={handleChange("start")} />
      </label>
      <label>
        End date
        <input type="date" value={end} onChange={handleChange("end")} />
      </label>
      <button type="button" onClick={onRefresh}>Refresh</button>
      <button type="button" className="secondary" onClick={onLogout}>Log out</button>
    </div>
  );
};
