import React, { useEffect, useState } from "react";
import "./AdminAI.css";
import Icon from "../../../constants/Icon.jsx";
import { Button } from "../../../components/Index.jsx";
import { useAIBotStore } from "../../../store/admin/useAIBotStore.js";
import AdminAICallDrawer from "./AdminAICallDrawer.jsx";

const AdminAICallLogs = () => {
  const { callsData, callsLoading, getCalls, getCallById } = useAIBotStore();
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [activeCallDetails, setActiveCallDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    getCalls();
  }, []);

  const handleRowClick = async (callId) => {
    setSelectedCallId(callId);
    setDetailsLoading(true);
    const details = await getCallById(callId);
    setActiveCallDetails(details);
    setDetailsLoading(false);
  };

  const handleCloseDrawer = () => {
    setSelectedCallId(null);
    setActiveCallDetails(null);
  };

  const getSourceBadge = (source) => {
    if (source === "freeswitch")
      return <span className="source_badge fs">SIP Call</span>;
    return <span className="source_badge tr">Web Test</span>;
  };

  const getStatusBadge = (status) => {
    if (!status) return <span className="source_badge tr">Unknown</span>;
    const lstat = status.toLowerCase();
    if (lstat === "completed")
      return <span className="source_badge fs">Completed</span>;
    if (lstat === "failed" || lstat === "error")
      return (
        <span
          className="source_badge"
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            borderColor: "#fca5a5",
          }}
        >
          Failed
        </span>
      );
    return (
      <span
        className="source_badge"
        style={{
          background: "#ffedd5",
          color: "#c2410c",
          borderColor: "#fed7aa",
        }}
      >
        Interrupted
      </span>
    );
  };

  return (
    <div className="admin_ai_call_logs_container">
      <div className="admin_ai_agents_header">
        <div>
          <h3>Call Logs</h3>
          <p>
            Review historical agent conversations and AI-generated summaries.
          </p>
        </div>
        <Button onClick={() => getCalls()} type="secondary">
          <Icon name="refersh" size={14} /> Refresh
        </Button>
      </div>

      {callsLoading ? (
        <div className="admin_ai_empty_container">
          <p style={{ color: "#64748b" }}>Loading calls...</p>
        </div>
      ) : callsData.length === 0 ? (
        <div className="admin_ai_empty_container">
          <div className="admin_ai_empty_state">
            <div className="admin_ai_empty_icon">
              <Icon name="message" size={48} color="#94a3b8" />
            </div>
            <h3>No Calls Yet</h3>
            <p>
              Once your AI Agents start talking to customers, logs will appear
              here.
            </p>
          </div>
        </div>
      ) : (
        <div className="ai_calls_table_wrapper">
          <table className="ai_calls_table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Source</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {callsData.map((call) => (
                <React.Fragment key={call.id}>
                  <tr
                    className={`ai_call_row ${selectedCallId === call.id ? "expanded" : ""}`}
                    onClick={() => handleRowClick(call.id)}
                  >
                    <td>
                      {new Date(call.started_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td>{getSourceBadge(call.source)}</td>
                    <td>{getStatusBadge(call.status)}</td>
                    <td>
                      {call.duration_sec ? `${call.duration_sec}s` : "--"}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminAICallDrawer
        isOpen={!!selectedCallId}
        onClose={handleCloseDrawer}
        callDetails={activeCallDetails}
        isLoading={detailsLoading}
      />
    </div>
  );
};

export default AdminAICallLogs;
