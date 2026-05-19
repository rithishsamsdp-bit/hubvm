import React, { useRef } from "react";
import { Loader } from "../../../components/Index.jsx";

export default function AdminAiDataViewer({
    aiData,
    isLoading,
    audioSrc,
    tab,
}) {

    const audioRef = useRef(null);

    if (isLoading) {
        return (
            <div className="h-[400px] flex justify-center items-center">
                <Loader />
            </div>
        );
    }

    if (!aiData) {
        return (
            <div className="p-10 text-center text-slate-500 font-medium">
                <p>No Analysis Data Available</p>
            </div>
        );
    }

    const { results } = aiData;
    const summary = results?.summary?.short || "No summary available.";
    const sentiments = results?.sentiments?.segments || [];
    const transcript = results?.channels?.[0]?.alternatives?.[0]?.transcript || "No transcript available.";
    const paragraphs = results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || [];

    return (
        <div className="flex flex-col gap-6">
            {/* Body */}
            <div className="flex flex-col gap-6">
                {tab === "context" ? (
                    <>
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Summary</h4>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm leading-relaxed text-slate-700">
                                {summary}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sentiment Analysis</h4>
                            <div className="grid gap-3">
                                {sentiments.length > 0 ? (
                                    sentiments.map((seg, i) => (
                                        <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100" key={i}>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight w-fit ${
                                                seg.sentiment === 'positive' 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : seg.sentiment === 'negative'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {seg.sentiment}
                                            </span>
                                            <p className="text-sm text-slate-700 leading-normal">{seg.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No sentiment segments found.</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {paragraphs.length > 0 ? (
                            paragraphs.map((para, i) => (
                                <div key={i} className="text-sm leading-relaxed text-slate-700 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    {para.sentences.map(s => s.text).join(" ")}
                                </div>
                            ))
                        ) : (
                            <div className="text-sm leading-relaxed text-slate-700 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                {transcript}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Audio */}
            {audioSrc && (
                <div className="sticky bottom-0 pt-4 bg-white border-t border-slate-100">
                    <audio
                        controls
                        preload="none"
                        className="w-full h-10"
                        ref={audioRef}
                    >
                        <source src={audioSrc} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
}
