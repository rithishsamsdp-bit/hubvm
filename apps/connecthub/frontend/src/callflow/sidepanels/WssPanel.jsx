import { useState } from "react";
import Icon from "../../constants/Icon.jsx";
import { Input, Select } from "../../components/Index.jsx";
import "./styles/RingToPanel.css";

export default function WssPanel({ rule, onRuleChange }) {
  const [showCallInitSettings, setShowCallInitSettings] = useState(true);

  const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

  /* Reusable URL builder */
  const buildGetUrl = (base, params) => {
    if (!base) return "";

    const queryString = (params || [])
      .filter((p) => p.key && p.value)
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");

    return queryString ? `${base}?${queryString}` : base;
  };

  return (
    <div className="ringto-sidebar">
      {/* ---------------- CALL INITIATION API SECTION ---------------- */}
      <div className="keypad-panel-message-settings">
        <div
          className="keypad-sidepanel-section-header"
          onClick={() => setShowCallInitSettings(!showCallInitSettings)}
        >
          <p>WebSocket</p>
          <Icon
            name={showCallInitSettings ? "uparrow" : "downarrow"}
            size={12}
            color="#0F172A"
          />
        </div>

        {showCallInitSettings && (
          <div className="api-section">
            {/* BASE URL */}
            <p className="ringto-sidepanel-input-label">WSS URL</p>
            <Input
              type="text"
              placeholder="Enter WSS endpoint"
              value={rule.wssUrl || ""}
              onChange={(e) => {
                const base = e.target.value;
                updateRule({ wssUrl: base });
              }}
            />

            {/* METHOD */}
            <p className="ringto-sidepanel-input-label">Frequency</p>
            <Select
              mode="single"
              placeholder="Select"
              showSearch={false}
              value={rule.frequency}
              onChange={(value) => updateRule({ frequency: value })}
               options={[
                { label: "8000 hz", value: "8000" },
                { label: "16000 hz", value: "16000" },
                { label: "24000 hz", value: "24000" },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
