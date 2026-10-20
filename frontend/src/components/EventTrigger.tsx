export function EventTrigger({
  onTrigger,
  disabled,
}: {
  onTrigger: (eventType: "electricity" | "water") => void;
  disabled: boolean;
}) {
  return (
    <div className="controls">
      <p className="controls-label">Demo controls — simulate a disruption event</p>
      <div className="controls-buttons">
        <button
          className="sim-btn"
          disabled={disabled}
          onClick={() => onTrigger("electricity")}
        >
          ⚡ Electricity outage
        </button>
        <button className="sim-btn" disabled={disabled} onClick={() => onTrigger("water")}>
          💧 Water outage
        </button>
      </div>
    </div>
  );
}
