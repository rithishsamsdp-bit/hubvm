import React, { useEffect, useRef } from "react";
import Icon from "../../../../constants/Icon.jsx";

const VoiceTestModal = ({
  isOpen,
  onClose,
  isConnected,
  isRecording,
  transcript,
  activeAgent,
  error,
  onMicClick,
}) => {
  const transcriptEndRef = useRef(null);

  // Auto-scroll to the newest message
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  if (!isOpen) return null;

  const statusLabel = isConnected
    ? isRecording
      ? "Listening..."
      : "Connected"
    : "Disconnected";

  return (
    <div
      className="vtm_overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="vtm_modal">
        {/* Header */}
        <div className="vtm_header">
          <div className="vtm_header_left">
            <div className={`vtm_status_dot ${isConnected ? "live" : ""}`} />
            <span className="vtm_header_title">Voice Test</span>
          </div>
          <div className="vtm_agent_badge">
            <Icon name="user" size={12} color="#ff5200" />
            <span>{activeAgent || "Start"}</span>
          </div>
          <button className="vtm_close_btn" onClick={onClose}>
            <Icon name="close" size={16} color="#64748b" />
          </button>
        </div>

        {/* Transcript Area */}
        <div className="vtm_transcript_area">
          {error && (
            <div className="vtm_empty_state" style={{ padding: "0 20px" }}>
              <div className="vtm_empty_icon">
                <Icon name="info" size={28} color="#ef4444" />
              </div>
              <p className="vtm_empty_title" style={{ color: "#ef4444" }}>
                Connection Error
              </p>
              <p
                className="vtm_empty_sub"
                style={{ color: "#ef4444", textAlign: "center" }}
              >
                {error}
              </p>
            </div>
          )}

          {!error && transcript.length === 0 && (
            <div className="vtm_empty_state">
              <div className="vtm_empty_icon">
                <Icon name="voice" size={28} color="#ff5200" />
              </div>
              <p className="vtm_empty_title">Ready to Talk</p>
              <p className="vtm_empty_sub">
                Press the mic button below and start speaking
              </p>
            </div>
          )}

          {!error &&
            transcript.map((msg) => {
              if (msg.role === "system") {
                return (
                  <div key={msg.id} className="vtm_system_msg">
                    <span className="vtm_system_dot" />
                    {msg.text}
                  </div>
                );
              }

              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`vtm_bubble_wrap ${isUser ? "user" : "bot"}`}
                >
                  <div className={`vtm_avatar ${isUser ? "user" : "bot"}`}>
                    <Icon
                      name={isUser ? "user" : "gen_ai"}
                      size={14}
                      color={isUser ? "#fff" : "#ff5200"}
                    />
                  </div>
                  <div
                    className={`vtm_bubble ${isUser ? "user" : "bot"} ${msg.streaming ? "streaming" : ""}`}
                  >
                    {!isUser && (
                      <div className="vtm_bubble_agent">
                        {msg.agent || activeAgent}
                      </div>
                    )}
                    <p className="vtm_bubble_text">{msg.text}</p>
                    {msg.streaming && <span className="vtm_cursor" />}
                  </div>
                </div>
              );
            })}
          <div ref={transcriptEndRef} />
        </div>

        {/* Mic Controls */}
        <div className="vtm_controls">
          <p className="vtm_status_label">{statusLabel}</p>
          <button
            className={`vtm_mic_btn ${isConnected ? (isRecording ? "listening" : "connected") : ""}`}
            onClick={onMicClick}
          >
            <div className="vtm_mic_rings">
              <div className="vtm_ring r1" />
              <div className="vtm_ring r2" />
              <div className="vtm_ring r3" />
            </div>
            <div className="vtm_mic_inner">
              <Icon
                name={isConnected ? "voice" : "microphone"}
                size={28}
                color="#fff"
              />
            </div>
          </button>
          {isConnected && (
            <button className="vtm_end_btn" onClick={onClose}>
              End
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceTestModal;
