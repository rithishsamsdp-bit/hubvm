// SidePanel.jsx
import React, { useState, useEffect } from "react";
import "./SidePanel.css";
import TimeRulePanel from "./sidepanels/TimeRulePanel.jsx";
import KeypadPanel from "./sidepanels/KeypadPanel.jsx";
import VoicemailPanel from "./sidepanels/VoicemailPanel.jsx";
import WaitingExperiencePanel from "./sidepanels/WaitingExperiencePanel.jsx";
import RingToPanel from "./sidepanels/RingToPanel.jsx";
import QueuePanel from "./sidepanels/QueuePanel.jsx";
import DialPanel from "./sidepanels/DialPanel.jsx";
import CallEndPanel from "./sidepanels/CallEndPanel.jsx";
import { Button } from "../components/Index.jsx";
import Icon from "../constants/Icon.jsx";
import AudioMessagePanel from "./sidepanels/AudioMessagePanel.jsx";
import ApiPanel from "./sidepanels/ApiPanel.jsx";
import WssPanel from "./sidepanels/WssPanel.jsx";
import AIBotPanel from "./sidepanels/AIBotPanel.jsx";

export default function SidePanel({
  node,
  onClose,
  onAddBranch,
  onDataChange,
  // NEW:
  onSyncChildNode,
  onRemoveChildNode,
  callflowName,
}) {
  const { type, data } = node;
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    let initData = { ...data };
    if (type === "timeRule" && !Array.isArray(initData.branches)) {
      initData.branches = [];
    }
    setLocalData(initData);
  }, [data, type]);

  const handleClose = (e) => {
    e.stopPropagation();
    onClose(localData);
  };

  const stop = (e) => e.stopPropagation();

  const updateData = (updates) => {
    setLocalData((ld) => ({ ...ld, ...updates }));
    onDataChange?.(updates);
  };

  // Full replacement – used when panels need to remove keys (e.g., audio delete)
  const replaceData = (newData) => {
    setLocalData(newData);
    onDataChange?.(newData, true);
  };

  return (
    <div className="flow-side-panel" onClick={stop}>
      <div className="flow-side-panel-header">
        <p>
          {type === "timeRule" && "Time Rule"}
          {type === "dateRule" && "Date Rule"}
          {type === "audioMsg" && "Audio Message"}
          {type === "keypad" && "Keypad (IVR)"}
          {type === "waitingExp" && "Waiting Experience"}
          {type === "ringTo" && "Ring To"}
          {type === "voicemail" && "Voicemail"}
          {type === "queue" && "Queue"}
          {type === "dial" && "Dial"}
          {type === "callEnd" && "Call End"}
          {type === "api" && "Api"}
          {type === "wss" && "WSS ( WebSocket )"}
          {type === "aiBot" && "AI Bot"}
        </p>
        <Button variant="empty" onClick={handleClose}>
          <Icon name="close" size={14} color="#5F6368" />
        </Button>
      </div>

      <div className="side-panel-body">
        {type === "timeRule" && (
          <TimeRulePanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
            onImmediateAdd={onAddBranch} // create node from branch
            onSyncChildNode={onSyncChildNode} // NEW: update node label
            onRemoveChildNode={onRemoveChildNode} // NEW: delete node & edges
          />
        )}

        {type === "keypad" && (
          <KeypadPanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
            onFullRuleChange={replaceData}
            onImmediateAdd={onAddBranch}
            onSyncChildNode={onSyncChildNode}
            onRemoveChildNode={onRemoveChildNode}
            callflowName={callflowName}
          />
        )}
        {type === "audioMsg" && (
          <AudioMessagePanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
            onFullRuleChange={replaceData}
            callflowName={callflowName}
          />
        )}
        {type === "voicemail" && (
          <VoicemailPanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
            onFullRuleChange={replaceData}
            callflowName={callflowName}
          />
        )}
        {type === "waitingExp" && (
          <WaitingExperiencePanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
          />
        )}
        {type === "ringTo" && (
          <RingToPanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
            onFullRuleChange={replaceData}
            callflowName={callflowName}
          />
        )}
        {type === "queue" && (
          <QueuePanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
          />
        )}
        {type === "dial" && (
          <DialPanel rule={localData} onRuleChange={(upd) => updateData(upd)} />
        )}
        {type === "callEnd" && (
          <CallEndPanel
            rule={localData}
            onRuleChange={(upd) => updateData(upd)}
          />
        )}
        {type === "api" && (
          <ApiPanel rule={localData} onRuleChange={(upd) => updateData(upd)} />
        )}
        {type === "wss" && (
          <WssPanel rule={localData} onRuleChange={(upd) => updateData(upd)} />
        )}
        {type === "aiBot" && (
          <AIBotPanel rule={localData} onRuleChange={(upd) => updateData(upd)} />
        )}

        {/* {![
                    "timeRule", "dateRule", "audioMsg", "keypad", "waitingExp", "ringTo", "voicemail", "queue", "dial",
                ].includes(type) && (
                        <p style={{ padding: 12, color: "#888" }}>
                            No editor available for node type: <b>{type}</b>
                        </p>
                    )} */}
      </div>
    </div>
  );
}
