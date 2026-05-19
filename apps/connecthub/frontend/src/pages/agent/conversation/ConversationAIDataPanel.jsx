import React, { useRef, useState, useEffect } from "react";
import { useAiStore } from "../../../store/agent/useAiStore";
import { useLiveTranscriptStore } from "../../../store/agent/useLiveTranscriptStore";
import {
  X,
  Mic,
  FileText,
  List,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
);

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
  initialTab,
}) {
  const [tab, setTab] = useState(initialTab || "live");
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

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isCallActive) {
      // Only force "live" tab if no initialTab is explicitly set to post-call
      if (initialTab !== "post-call" && initialTab !== "transcript") {
        setTab("live");
      }
      clearTranscript();
      startListening();
    } else {
      stopListening();
      clearTranscript();
      if (!initialTab) setTab("post-call");
    }
    return () => {
      stopListening();
    };
  }, [isCallActive]);

  useEffect(() => {
    if (tab === "live") {
      transcriptEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [transcript, tab]);

  return (
    <div className="w-[350px] max-w-[90vw] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right-8 duration-300 ease-out shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            {isCallActive ? "Live Transcription" : "Post Call Data"}
          </h2>
          {!isCallActive && (
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {callTitle} • {callDuration} • {callTime}
            </p>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
            onClick={() => {
              stopListening();
              onClose();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2 border-b border-slate-100 bg-white">
        {isCallActive ? (
          <button
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === "live"
                ? "border-red-500 text-red-600"
                : "border-transparent text-slate-500"
            }`}
            onClick={() => setTab("live")}
          >
            <Mic className="w-4 h-4 animate-pulse" />
            Live Transcription
          </button>
        ) : (
          <>
            <button
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === "post-call"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab("post-call")}
            >
              <List className="w-4 h-4" />
              Summary
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === "transcript"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab("transcript")}
            >
              <FileText className="w-4 h-4" />
              Transcript
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 scrollbar-thin">
        {tab === "live" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-center py-2 mb-4">
              {isListening ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Listening...
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              ) : (
                <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Starting transcription...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 pb-4">
              {transcript.length === 0 && isListening && (
                <p className="text-center text-sm text-slate-400 italic mt-10">
                  Speak to see transcript here...
                </p>
              )}
              {transcript.map((line) => {
                const isAgent = line.speaker === 1;
                return (
                  <div
                    key={line.id}
                    className={`flex gap-3 ${isAgent ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full text-xs font-bold shadow-sm ${
                        isAgent
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isAgent
                        ? String(agentName || "A")
                            .charAt(0)
                            .toUpperCase()
                        : String(customerName || "C")
                            .charAt(0)
                            .toUpperCase()}
                    </div>
                    <div
                      className={`flex flex-col max-w-[80%] ${isAgent ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] font-semibold text-slate-500 mb-1 px-1">
                        {isAgent ? agentName : customerName}
                      </span>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isAgent
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                        }`}
                      >
                        {line.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}

        {tab === "post-call" &&
          (loading ? (
            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-full h-20" />
              </div>
              <div className="space-y-3">
                <Skeleton className="w-32 h-5" />
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-full h-10" />
              </div>
            </div>
          ) : aiData == null ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
              No post-call data available.
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Summary
                </h5>
                <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  {aiData?.results?.summary?.short || "—"}
                </p>
              </div>

              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Positive Moments
                </h5>
                <ul className="space-y-2">
                  {aiData?.results?.sentiments?.segments
                    ?.filter((seg) => seg.sentiment === "positive")
                    .map((seg, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600 bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2"
                      >
                        <span className="text-emerald-500 mt-0.5">•</span>
                        {seg.text}
                      </li>
                    ))}
                  {(aiData?.results?.sentiments?.segments || []).filter(
                    (seg) => seg.sentiment === "positive",
                  ).length === 0 && (
                    <li className="text-sm text-slate-400 italic px-2">
                      No positive moments detected.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}

        {tab === "transcript" &&
          (loading ? (
            <div className="space-y-3 pt-2">
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-11/12 h-4" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-4/5 h-4" />
              <Skeleton className="w-[95%] h-4" />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mt-2">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {aiData?.results?.channels?.[0]?.alternatives?.[0]
                  ?.transcript || "No transcript available."}
              </p>
            </div>
          ))}
      </div>

      {/* Audio Player */}
      {!isCallActive && audioSrc && audioSrc !== "" && (
        <div className="p-4 border-t border-slate-200 bg-white">
          <audio controls preload="none" className="w-full h-10 outline-none">
            <source src={audioSrc} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}
