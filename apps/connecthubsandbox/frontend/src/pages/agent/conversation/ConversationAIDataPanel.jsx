import React, { useRef, useState, useEffect } from "react";
import "./styles/conversation_ai_data_panel.css";
import { useAiStore } from "../../../store/agent/useAiStore";
import { useLiveTranscriptStore } from "../../../store/agent/useLiveTranscriptStore";
import { Loader } from "../../../components/Index.jsx";

export default function ConversationAIDataPanel({
  callTitle = "Voice Call",
  callDuration = "",
  callTime = "",
  customAiData,
  isLoading,
  audioSrc,
  isCallActive = false,
  agentName = "Agent",
  customerName = "Customer",
  onClose,
}) {
  const [tab, setTab] = useState("live");

  const transcriptEndRef = useRef(null);

  const { aiDataLoading, aiData: storeAiData } = useAiStore();
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  } = useLiveTranscriptStore();

  const aiData = customAiData || storeAiData;
  const loading = isLoading !== undefined ? isLoading : aiDataLoading;

  // Auto-start/stop listening based on call state
  useEffect(() => {
    if (isCallActive) {
      setTab("live");
      clearTranscript();
      startListening();
    } else {
      stopListening();
      setTab("post-call");
    }
    return () => {
      stopListening();
    };
  }, [isCallActive]);


  // Auto-scroll to latest transcript line
  useEffect(() => {
    if (tab === "live") {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, tab]);

  return (
    <div className="conversation_ai_data_panel">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="conversation_ai_data_panel_heading">
          {isCallActive ? "Live Transcription" : "Post Call Data"}
        </p>
        {/* Close button — only post-call */}
        {!isCallActive && onClose && (
          <button
            onClick={onClose}
            title="Close panel"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              color: "#9ca3af",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Meta row — only post-call */}
      {!isCallActive && (
        <div className="meta-row">
          <div className="meta-left">
            <div className="meta-title">{callTitle}</div>
            <div className="meta-time">{callTime}</div>
          </div>
          <div className="meta-duration">{callDuration}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="conversation_ai_data_panel_tabs">
        {isCallActive ? (
          /* During call: only Live tab */
          <button
            className={`tab ${tab === "live" ? "active" : ""}`}
            onClick={() => setTab("live")}
          >
            🔴 Live Transcription
          </button>
        ) : (
          /* Post call: Summary + Full Transcript */
          <>
            <button
              className={`tab ${tab === "post-call" ? "active" : ""}`}
              onClick={() => setTab("post-call")}
            >
              📋 Summary
            </button>
            <button
              className={`tab ${tab === "transcript" ? "active" : ""}`}
              onClick={() => setTab("transcript")}
            >
              📝 Transcript
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="panel-body">

        {/* ── LIVE TAB ── */}
        {tab === "live" && (
          <div className="live-transcript-container">
            {/* Status bar */}
            <div className="live-status-bar">
              {isListening ? (
                <span className="live-dot">
                  <span className="live-dot-pulse" />
                  Listening…
                </span>
              ) : error ? (
                <span className="live-error">⚠ {error}</span>
              ) : (
                <span className="live-idle">Starting transcription…</span>
              )}
            </div>

            {/* Transcript messages */}
            <div className="live-messages">
              {transcript.length === 0 && isListening && (
                <p className="live-empty">Speak to see transcript here…</p>
              )}
              {transcript.map((line) => {
                const isAgent = line.speaker === 1;
                return (
                  <div
                    key={line.id}
                    className={`live-msg ${isAgent ? "live-msg-agent" : "live-msg-customer"}`}
                  >
                    <div className="live-msg-avatar">
                      {isAgent
                        ? String(agentName || "A").charAt(0).toUpperCase()
                        : String(customerName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="live-msg-body">
                      <span className="live-msg-name">
                        {isAgent ? agentName : customerName}
                      </span>
                      <p className="live-msg-text">{line.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}

        {/* ── POST-CALL SUMMARY TAB ── */}
        {tab === "post-call" &&
          (loading ? (
            <div style={{ height: "100%" }}>
              <Loader />
            </div>
          ) : aiData == null ? (
            <p
              className="section-text"
              style={{
                color: "#9ca3af",
                textAlign: "center",
                marginTop: "40px",
              }}
            >
              No post-call data available.
            </p>
          ) : (
            <div className="context">
              <section className="section">
                <h5 className="section-title">Summary</h5>
                <p className="section-text">
                  {aiData?.results?.summary?.short || "—"}
                </p>
              </section>
              <section className="section">
                <h5 className="section-title">Positive Moments</h5>
                <ul className="section-list">
                  {aiData?.results?.sentiments?.segments
                    ?.filter((seg) => seg.sentiment === "positive")
                    .map((seg, i) => (
                      <li key={i}>{seg.text}</li>
                    ))}
                </ul>
              </section>
            </div>
          ))}

        {/* ── FULL TRANSCRIPT TAB ── */}
        {tab === "transcript" &&
          (loading ? (
            <div style={{ height: "100%" }}>
              <Loader />
            </div>
          ) : (
            <div className="transcript">
              <p className="section-text">
                {aiData?.results?.channels?.[0]?.alternatives?.[0]
                  ?.transcript || "No transcript available."}
              </p>
            </div>
          ))}
      </div>

      {/* Audio player — post-call only */}
      {!isCallActive && audioSrc && audioSrc !== "" && (
        <div className="audio-bar">
          <audio controls preload="none" style={{ width: "100%" }}>
            <source src={audioSrc} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}
