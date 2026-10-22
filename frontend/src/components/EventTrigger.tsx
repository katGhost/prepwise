import "./EventTrigger.css";
import { Droplets, Zap } from "lucide-react";

export function EventTrigger({
  onTrigger,
  disabled,
}: {
  onTrigger: (eventType: "electricity" | "water") => void;
  disabled: boolean;
}) {
  return (
    <div className="controls" style={{ marginBottom: "2rem", gap: "20px" }}>
        <p className="controls-label">Demo controls — simulate a disruption event</p>
        <div className="controls-buttons">
            <button
                className="sim-btn"
                disabled={disabled}
                onClick={() => onTrigger("electricity")}
            >
                <Zap size={24} color="coral" /> Electricity outage
            </button>
            <button className="sim-btn" disabled={disabled} onClick={() => onTrigger("water")}>
                <Droplets size={24} color="skyblue" /> Water outage
            </button>
        </div>
    </div>
  );
}
