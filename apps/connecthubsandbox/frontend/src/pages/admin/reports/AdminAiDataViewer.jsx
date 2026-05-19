import React, { useState, useRef } from "react";
import "./styles/AdminAiDataViewer.css";
import { Loader } from "../../../components/Index.jsx";

export default function AdminAiDataViewer({
    aiData,
    isLoading,
    audioSrc,
    tab,
}) {

    const audioRef = useRef(null);

    const onLoaded = () => { };
    const onTime = () => { };



    if (isLoading) {
        return (
            <div style={{ height: "400px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Loader />
            </div>
        );
    }

    if (!aiData) {
        return (
            <div className="admin-ai-viewer">
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <p>No Analysis Data Available</p>
                </div>
            </div>
        );
    }

    const { results } = aiData;
    const summary = results?.summary?.short || "No summary available.";
    const sentiments = results?.sentiments?.segments || [];
    const transcript = results?.channels?.[0]?.alternatives?.[0]?.transcript || "No transcript available.";

    const paragraphs = results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || [];

    return (
        <div className="admin-ai-viewer">
            {/* Body */}
            <div className="admin-ai-viewer-body">
                {tab === "context" ? (
                    <>
                        <div className="ai-section">
                            <h4 className="ai-section-title">Summary</h4>
                            <p className="ai-summary-text">{summary}</p>
                        </div>

                        <div className="ai-section">
                            <h4 className="ai-section-title">Sentiment Analysis</h4>
                            <div className="sentiment-grid">
                                {sentiments.length > 0 ? (
                                    sentiments.map((seg, i) => (
                                        <div className="sentiment-item" key={i}>
                                            <span className={`sentiment-badge ${seg.sentiment}`}>
                                                {seg.sentiment}
                                            </span>
                                            <p className="sentiment-text">{seg.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="ai-summary-text">No sentiment segments found.</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="transcript-container">
                        {paragraphs.length > 0 ? (
                            paragraphs.map((para, i) => (
                                <div key={i} className="transcript-paragraph">
                                    {para.sentences.map(s => s.text).join(" ")}
                                </div>
                            ))
                        ) : (
                            <p className="transcript-paragraph">{transcript}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Audio */}
            {audioSrc && (
                <div className="admin-ai-audio-bar">
                    <audio
                        controls
                        preload="none"
                        style={{ width: "100%" }}
                        ref={audioRef}
                        onLoadedMetadata={onLoaded}
                        onTimeUpdate={onTime}
                    >
                        <source src={audioSrc} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
}
