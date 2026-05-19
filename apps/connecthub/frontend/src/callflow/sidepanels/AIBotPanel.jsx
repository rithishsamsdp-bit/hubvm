import { useState, useEffect } from "react";
import Icon from "../../constants/Icon.jsx";
import { Input, Select } from "../../components/Index.jsx";
import "./styles/RingToPanel.css";
import { useCallFlow } from "../../store/useCallFlow.js";

export default function AIBotPanel({ rule, onRuleChange }) {
  const [showCallInitSettings, setShowCallInitSettings] = useState(true);
  const { getAiBots, aiBotsData, aiBotsLoading } = useCallFlow();

  useEffect(() => {
    getAiBots();

    // Enforce 8000 Hz for FreeSwitch compat on mount if not set
    if (!rule.frequency) {
      updateRule({ frequency: "8000" });
    }
  }, []);

  // Format for our Select component
  const bots = (aiBotsData || []).map((bot) => ({
    label: bot.name,
    value: bot.id,
  }));

  const updateRule = (updates) => onRuleChange({ ...rule, ...updates });

  return (
    <div className="ringto-sidebar">
      {/* ---------------- AI BOT SETTINGS SECTION ---------------- */}
      <div className="keypad-panel-message-settings">
        <div
          className="keypad-sidepanel-section-header"
          onClick={() => setShowCallInitSettings(!showCallInitSettings)}
        >
          <p>AI Agent Configuration</p>
          <Icon
            name={showCallInitSettings ? "uparrow" : "downarrow"}
            size={12}
            color="#0F172A"
          />
        </div>

        {showCallInitSettings && (
          <div className="api-section">
            {/* BOT SELECTION */}
            <p className="ringto-sidepanel-input-label">Select AI Bot</p>
            <Select
              mode="single"
              placeholder={aiBotsLoading ? "Loading bots..." : "Select AI Bot"}
              showSearch={false}
              value={rule.bot_id}
              onChange={(value) => {
                const selectedBot = bots.find((b) => b.value === value);
                updateRule({
                  bot_id: value,
                  bot_name: selectedBot ? selectedBot.label : "",
                });
              }}
              options={bots}
            />

            {/* FREQUENCY (Locked to standard FreeSWITCH audio configs but visible) */}
            <p className="ringto-sidepanel-input-label">Stream Frequency</p>
            <Select
              mode="single"
              placeholder="Select"
              showSearch={false}
              value={rule.frequency || "8000"}
              onChange={(value) => updateRule({ frequency: value })}
              options={[
                { label: "8000 hz (Standard PBX)", value: "8000" },
                { label: "16000 hz (Wideband)", value: "16000" },
                { label: "24000 hz (Ultra)", value: "24000" },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
