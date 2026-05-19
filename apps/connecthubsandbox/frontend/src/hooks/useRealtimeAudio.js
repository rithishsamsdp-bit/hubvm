import { useState, useRef, useCallback } from 'react';

const useRealtimeAudio = (agentId) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [activeAgent, setActiveAgent] = useState('Start');
    const [error, setError] = useState(null);
    
    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const streamRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const cancelledRef = useRef(false); // cancellation flag
    const scheduledSourcesRef = useRef([]);

    const base64ToArrayBuffer = (base64) => {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const playAudioChunk = async (base64Data, ctx) => {
        try {
            if (!ctx) return;
            // Ensure audio context is running (fixes browser autoplay policies blocking it)
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            if (ctx.state === 'closed') return;

            const buffer = base64ToArrayBuffer(base64Data);
            
            // Safeguard: Ensure byteLength is a multiple of 2 for Int16Array
            const validByteLength = Math.floor(buffer.byteLength / 2) * 2;
            const int16 = new Int16Array(buffer, 0, validByteLength / 2);
            
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] < 0 ? int16[i] / 0x8000 : int16[i] / 0x7FFF;
            }
            
            if (float32.length === 0) return;

            const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            // Catch up if we are lagging
            if (nextPlayTimeRef.current < ctx.currentTime) {
                nextPlayTimeRef.current = ctx.currentTime;
            }
            
            const startTime = nextPlayTimeRef.current;
            source.start(startTime);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;
            
            scheduledSourcesRef.current.push(source);
            source.onended = () => {
                scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
            };
        } catch(e) {
            console.error("Playback error:", e);
        }
    };

    const connectAndStart = useCallback(async (config) => {
        // Reset state
        cancelledRef.current = false;
        setError(null);
        setTranscript([]);
        setActiveAgent(config.nodes?.[0]?.data?.label || 'Start');

        try {
            // 0. Create AudioContext synchronously with user click (fixes suspended state)
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            audioCtxRef.current = audioCtx;
            nextPlayTimeRef.current = audioCtx.currentTime;
            
            // Resume immediately in case browser starts it suspended
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // 1. WebSocket URL resolution
            const isProd = window.location.protocol === 'https:';
            let hostUrl = import.meta.env.VITE_AI_API || (isProd ? 'https://connecthub.pulsework360.com' : 'http://localhost:8000');
            let wsBase = hostUrl.replace('http://', 'ws://').replace('https://', 'wss://');
            if (!wsBase.startsWith('ws')) {
                wsBase = isProd ? `wss://${hostUrl}` : `ws://${hostUrl}`;
            }

            const wsUrl = `${wsBase}/ws/voice/${agentId}`;
            console.log("Connecting Voice Bot WS to:", wsUrl);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (cancelledRef.current) { ws.close(); return; }
                setIsConnected(true);
                ws.send(JSON.stringify(config));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.event === 'audio' && audioCtxRef.current) {
                        playAudioChunk(msg.data, audioCtxRef.current);
                    }

                    if (msg.event === 'clear_audio') {
                        // Stop all scheduled audio buffers gracefully without breaking the context worklets
                        scheduledSourcesRef.current.forEach(source => {
                            try { source.stop(); } catch(e) {}
                        });
                        scheduledSourcesRef.current = [];
                        
                        if (audioCtxRef.current) {
                            nextPlayTimeRef.current = audioCtxRef.current.currentTime;
                        }

                        // Mark transcript as interrupted visually to confirm barge-in
                        setTranscript(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === 'bot' && last.streaming) {
                                return [
                                    ...prev.slice(0, -1), 
                                    { ...last, streaming: false, text: last.text + ' 🛑 (interrupted)' }
                                ];
                            }
                            return prev;
                        });
                    }

                    if (msg.event === 'text_delta') {
                        setTranscript(prev => {
                            const last = prev[prev.length - 1];
                            const fullText = (last?.streaming ? last.text : '') + msg.text;
                            if (last && last.role === 'bot' && last.streaming) {
                                return [...prev.slice(0, -1), { ...last, text: fullText }];
                            }
                            return [...prev, { role: 'bot', text: fullText, agent: msg.agent || activeAgent, streaming: true, id: Date.now() }];
                        });
                    }

                    if (msg.event === 'text_done') {
                        setTranscript(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === 'bot' && last.streaming) {
                                return [...prev.slice(0, -1), { ...last, streaming: false }];
                            }
                            return prev;
                        });
                    }

                    if (msg.event === 'user_text') {
                        setTranscript(prev => [...prev, { role: 'user', text: msg.text, agent: 'You', id: Date.now() }]);
                    }

                    if (msg.event === 'agent_changed') {
                        setActiveAgent(msg.agent_name);
                        setTranscript(prev => [...prev, {
                            role: 'system',
                            text: `Transferred to ${msg.agent_name}`,
                            id: Date.now()
                        }]);
                    }
                } catch(e) {
                    console.error("Error processing msg", e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setIsRecording(false);
            };

            ws.onerror = (err) => {
                console.error("WS Error:", err);
            };

            // 2. Set up AudioContext ONLY after WS connects (wait for open)
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("WS connection timed out")), 8000);
                if (ws.readyState === WebSocket.OPEN) { clearTimeout(timeout); resolve(); return; }
                ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
                ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error("WS connection failed")); }, { once: true });
                ws.addEventListener('close', () => { clearTimeout(timeout); reject(new Error("WS closed before open")); }, { once: true });
            });

            // Guard: if stop() was called while waiting for WS
            if (cancelledRef.current) return;

            // 3. Keep proceeding with audio processing
            await audioCtx.audioWorklet.addModule('/audio-processor.js');

            // Guard: check if cancelled or context closed during addModule
            if (cancelledRef.current || audioCtx.state === 'closed') return;

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    channelCount: 1, 
                    sampleRate: 24000, 
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            }); 

            // Guard again after getUserMedia
            if (cancelledRef.current || audioCtx.state === 'closed') {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            streamRef.current = stream;

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = new AudioWorkletNode(audioCtx, 'pcm-processor');

            processor.port.onmessage = (e) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    const bytes = new Uint8Array(e.data);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    wsRef.current.send(JSON.stringify({ event: 'audio', data: window.btoa(binary) }));
                }
            };

            source.connect(processor);
            
            // Fix: Connect processor to destination through a zero-gain node 
            // to prevent browser from throttling/silencing the audio stream
            const silentSink = audioCtx.createGain();
            silentSink.gain.value = 0;
            processor.connect(silentSink);
            silentSink.connect(audioCtx.destination);
            
            processorRef.current = processor;
            setIsRecording(true);

            // Signal backend that we are ready to receive audio (prevents First Message race condition)
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ event: 'client_ready' }));
            }

        } catch (err) {
            console.error("Failed to start voice:", err);
            setError(err.message || "Failed to access microphone. Please ensure you are using HTTPS or localhost.");
            // Don't call stop() here — just clean up quietly
            cancelledRef.current = true;
            setIsConnected(false);
            setIsRecording(false);
        }
    }, [agentId]);

    const stop = useCallback(() => {
        cancelledRef.current = true;

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (processorRef.current) {
            try {
                processorRef.current.port.close();
                processorRef.current.disconnect();
            } catch(e) {}
            processorRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        setIsConnected(false);
        setIsRecording(false);
    }, []);

    return {
        isConnected,
        isRecording,
        transcript,
        activeAgent,
        error,
        connectAndStart,
        stop
    };
};

export default useRealtimeAudio;
