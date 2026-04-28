import { ChangeEvent } from "react";

type DisplayMode = "auto" | "1" | "2" | "3";

type Props = {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
  onRefresh: () => void;
  onLogout: () => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (nextMode: DisplayMode) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  canFullscreen: boolean;
};

export const DateRangePicker = ({
  start,
  end,
  onChange,
  onRefresh,
  onLogout,
  displayMode,
  onDisplayModeChange,
  onToggleFullscreen,
  isFullscreen,
  canFullscreen,
}: Props) => {
  const handleChange = (key: "start" | "end") => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      start: key === "start" ? event.target.value : start,
      end: key === "end" ? event.target.value : end,
    });
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
      <label>
        Display
        <select
          value={displayMode}
          onChange={(event) => onDisplayModeChange(event.target.value as DisplayMode)}
        >
          <option value="auto">Auto-fit</option>
          <option value="1">1 column</option>
          <option value="2">2 column</option>
          <option value="3">3 column</option>
        </select>
      </label>
      <button type="button" onClick={onRefresh}>Refresh</button>
      <button
        type="button"
        className="secondary"
        onClick={onToggleFullscreen}
        disabled={!canFullscreen}
        title={canFullscreen ? undefined : "Fullscreen requires iframe permission."}
        aria-pressed={isFullscreen}
      >
        {isFullscreen ? "Exit full screen" : "Full screen"}
      </button>
      <button type="button" className="secondary" onClick={onLogout}>Log out</button>
    </div>
  );
};
