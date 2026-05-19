import React, { useState } from "react";
import "./AdminAICallDrawer.css";
import Icon from "../../../constants/Icon.jsx";

const AdminAICallDrawer = ({ isOpen, onClose, callDetails, isLoading }) => {
  const [activeTab, setActiveTab] = useState("transcription");

  if (!isOpen) return null;

  return (
    <>
      <div className="call_drawer_overlay" onClick={onClose} />
      <div className={`call_drawer_container ${isOpen ? "open" : ""}`}>
        <div className="call_drawer_header">
          <div className="drawer_header_left">
            <h3>Call Details</h3>
            {callDetails && (
              <span className="drawer_call_id">
                ID: {callDetails.id.slice(0, 8)}...
              </span>
            )}
          </div>
          <button className="drawer_close_btn" onClick={onClose}>
            <Icon name="close" size={20} color="#64748b" />
          </button>
        </div>

        {/* Tabs */}
        <div className="call_drawer_tabs">
          {[
            { id: "overview", label: "Overview" },
            { id: "transcription", label: "Transcription" },
            { id: "client_data", label: "Client data" },
          ].map((tab) => (
            <div
              key={tab.id}
              className={`drawer_tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="drawer_loading">
            <Icon name="refersh" size={24} color="#94a3b8" />
            <p>Loading call data...</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && callDetails && (
          <div className="drawer_content_body">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="drawer_overview">
                <div className="overview_stat_grid">
                  <div className="overview_stat">
                    <span className="stat_label">Status</span>
                    <span
                      className={`stat_value badge_${callDetails.status || "default"}`}
                    >
                      {(callDetails.status || "Unknown").toUpperCase()}
                    </span>
                  </div>
                  <div className="overview_stat">
                    <span className="stat_label">Duration</span>
                    <span className="stat_value">
                      {callDetails.duration_sec}s
                    </span>
                  </div>
                  <div className="overview_stat">
                    <span className="stat_label">End Reason</span>
                    <span className="stat_value">
                      {callDetails.end_reason || "Not specified"}
                    </span>
                  </div>
                  <div className="overview_stat">
                    <span className="stat_label">Caller</span>
                    <span className="stat_value">
                      {callDetails.caller_number || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="overview_section">
                  <h4>AI Summary</h4>
                  <div className="summary_box">
                    {callDetails.summary ||
                      "No summary available for this call."}
                  </div>
                </div>
              </div>
            )}

            {/* Transcription Tab */}
            {activeTab === "transcription" && (
              <div className="drawer_transcription">
                {!callDetails.transcript ||
                callDetails.transcript.length === 0 ? (
                  <div className="empty_transcript">
                    No conversation recorded.
                  </div>
                ) : (
                  <div className="chat_feed">
                    {callDetails.transcript.map((msg, idx) => {
                      if (typeof msg === "string") {
                        // LEGACY STRING FALLBACK
                        const isUser = msg.toLowerCase().startsWith("user:");
                        return (
                          <div
                            key={`legacy-${idx}`}
                            className={`chat_row ${isUser ? "row_user" : "row_agent"}`}
                          >
                            <div
                              className={`chat_bubble ${isUser ? "bubble_user" : "bubble_agent"}`}
                            >
                              {msg
                                .replace(/^(User:|Agent \([^)]+\):)/i, "")
                                .trim()}
                            </div>
                          </div>
                        );
                      }

                      // NEW RICH OBJECT RENDERING
                      const isUser = msg.role === "user";
                      return (
                        <div
                          key={idx}
                          className={`chat_row ${isUser ? "row_user" : "row_agent"}`}
                        >
                          {!isUser && (
                            <div className="chat_avatar">
                              <div className="avatar_circle">AI</div>
                              <span className="avatar_name">
                                {msg.agent_name || "Agent"}
                              </span>
                            </div>
                          )}

                          <div
                            className={`chat_bubble_container ${isUser ? "container_user" : "container_agent"}`}
                          >
                            <div
                              className={`chat_bubble ${isUser ? "bubble_user" : "bubble_agent"}`}
                            >
                              {msg.text}
                              {msg.time_offset && (
                                <span
                                  className={`bubble_time ${isUser ? "time_user" : "time_agent"}`}
                                >
                                  {msg.time_offset}
                                </span>
                              )}
                            </div>

                            <Icon
                              name="voice"
                              size={12}
                              color="#94a3b8"
                              className="audio_icon"
                            />

                            {/* Metrics Pills */}
                            {msg.metrics &&
                              Object.keys(msg.metrics).length > 0 && (
                                <div className="bubble_metrics">
                                  {msg.metrics.stt_ms && (
                                    <span className="metric_pill">
                                      STT <b>{msg.metrics.stt_ms} ms</b>
                                    </span>
                                  )}
                                  {msg.metrics.llm_ms && (
                                    <span className="metric_pill">
                                      LLM <b>{msg.metrics.llm_ms} ms</b>
                                    </span>
                                  )}
                                  {msg.metrics.audio_ms && (
                                    <span className="metric_pill">
                                      Audio <b>{msg.metrics.audio_ms} ms</b>
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Client Data (API Calls) */}
            {activeTab === "client_data" && (
              <div className="drawer_client_data">
                {!callDetails.api_calls ||
                callDetails.api_calls.length === 0 ? (
                  <div className="empty_api">
                    No external API calls triggered.
                  </div>
                ) : (
                  <div className="api_logs_list">
                    {callDetails.api_calls.map((api, idx) => (
                      <div key={idx} className="api_log_card">
                        <div className="api_log_header">
                          <span
                            className={`api_method ${api.method?.toLowerCase()}`}
                          >
                            {api.method}
                          </span>
                          <span className="api_endpoint">{api.action}</span>
                          <span className={`api_status ${api.status}`}>
                            {api.status}
                          </span>
                        </div>
                        <div className="api_log_body">
                          <div className="api_code_block">
                            <strong>Request Body</strong>
                            <pre>{JSON.stringify(api.request, null, 2)}</pre>
                          </div>
                          <div className="api_code_block">
                            <strong>Response Body</strong>
                            <pre>{JSON.stringify(api.response, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phone Call (Placeholder) */}
            {/* {activeTab === "phone_call" && (
              <div className="drawer_empty_tab">
                <Icon name="voice" size={48} color="#e2e8f0" />
                <p>Phone provider network logs will appear here in the future.</p>
              </div>
            )} */}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminAICallDrawer;
