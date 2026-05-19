import { create } from "zustand";
import { DeepgramClient } from "@deepgram/sdk";

const DEEPGRAM_API_KEY = "6b4ad2874ac9bcc06ef0ff6c62420554b67a1389";

export const useLiveTranscriptStore = create((set, get) => ({
  // Reactive state
  isListening: false,
  transcript: [], // [{ id, speaker: 0|1, text }]
  error: null,

  // Non-reactive internals
  _connection: null,
  _stream: null,
  _processor: null,
  _audioCtx: null,
  _idCounter: 0,

  startListening: async () => {
    const state = get();
    if (state.isListening) return;

    try {
      // 1. Agent mic audio
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // 2. Customer remote audio — wait 500ms for attachRemoteAudio() to finalize
      let remoteStream = null;
      await new Promise((r) => setTimeout(r, 500));
      try {
        const remoteAudioEl = document.getElementById("remoteAudio");
        if (remoteAudioEl?.srcObject) {
          const tracks = remoteAudioEl.srcObject.getAudioTracks();
          if (tracks.length > 0) {
            remoteStream = remoteAudioEl.srcObject;
            console.log("[LiveTranscript] ✅ Remote audio captured:", tracks.length, "track(s)");
          } else {
            console.warn("[LiveTranscript] ⚠️ srcObject has no audio tracks");
          }
        } else {
          console.warn("[LiveTranscript] ⚠️ remoteAudio.srcObject not set");
        }
      } catch (e) {
        console.warn("[LiveTranscript] ⚠️ Remote audio capture failed:", e.message);
      }

      const hasRemote = !!(remoteStream && remoteStream.getAudioTracks().length > 0);
      console.log("[LiveTranscript] Stereo mode:", hasRemote ? "YES (2-ch)" : "NO (mic only, 1-ch)");

      // 3. Deepgram client — stereo multichannel when remote available
      const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

      const connection = await deepgram.listen.v1.connect(
        hasRemote
          ? {
              // STEREO: Ch0=Agent, Ch1=Customer → Deepgram separates them perfectly
              model: "nova-2",
              language: "en-IN",
              multichannel: true,
              channels: 2,
              punctuate: true,
              smart_format: true,
              encoding: "linear16",
              sample_rate: 16000,
            }
          : {
              // MONO fallback: mic only with diarize
              model: "nova-2",
              language: "en-IN",
              diarize: true,
              channels: 1,
              punctuate: true,
              smart_format: true,
              encoding: "linear16",
              sample_rate: 16000,
            }
      );

      // 4. Event handlers
      connection.on("open", () => {
        console.log("[LiveTranscript] ✅ Deepgram connection OPENED", hasRemote ? "(stereo)" : "(mono)");
      });

      connection.on("message", (data) => {
        try {
          if (data.type !== "Results") return;
          const alt = data.channel?.alternatives?.[0];
          if (!alt || !alt.transcript?.trim()) return;
          if (!data.is_final) return;

          let speaker;
          if (hasRemote) {
            // multichannel: channel_index[0] = 0 → customer, 1 → agent
            speaker = Array.isArray(data.channel_index) ? data.channel_index[0] : 0;
          } else {
            // mono diarize: use word-level speaker from diarization
            const words = alt.words || [];
            speaker = words[0]?.speaker ?? 0;
          }

          console.log(`[LiveTranscript] 📩 Speaker ${speaker}:`, alt.transcript);

          set((prev) => ({
            transcript: [
              ...prev.transcript,
              { id: prev._idCounter + 1, speaker, text: alt.transcript.trim() },
            ],
            _idCounter: prev._idCounter + 1,
          }));
        } catch (err) {
          console.error("[LiveTranscript] parse error", err);
        }
      });

      connection.on("error", (err) => {
        console.error("[LiveTranscript] ❌ SDK error:", err);
        set({ error: "Deepgram connection failed" });
      });

      connection.on("close", (ev) => {
        console.log("[LiveTranscript] 🔴 Connection closed:", ev.code, ev.reason);
        set({ isListening: false });
      });

      // 5. Open WebSocket
      connection.connect();
      await connection.waitForOpen();
      console.log("[LiveTranscript] 🎙 Setting up audio pipeline...");

      // 6. AudioContext setup
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
        console.log("[LiveTranscript] 🔓 AudioContext resumed");
      }

      const micSource = audioCtx.createMediaStreamSource(micStream);

      // Silence node — processor must be connected somewhere to fire onaudioprocess
      // but we don't want mic/merged audio playing through speakers
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      silentGain.connect(audioCtx.destination);

      let processor;

      if (hasRemote) {
        // ── STEREO MODE: Ch0=Agent mic, Ch1=Customer remote ──
        const remoteSource = audioCtx.createMediaStreamSource(remoteStream);

        // Keep customer audio playing through speakers (re-route from element)
        remoteSource.connect(audioCtx.destination);

        // ChannelMerger: input 0 = remote (right), input 1 = mic (left)
        const merger = audioCtx.createChannelMerger(2);
        remoteSource.connect(merger, 0, 0); // remote → channel 0 (Speaker 0 - usually Customer in this case)
        micSource.connect(merger, 0, 1);    // mic    → channel 1 (Speaker 1 - Agent)

        processor = audioCtx.createScriptProcessor(4096, 2, 2);
        let packetCount = 0;

        processor.onaudioprocess = (e) => {
          if (!connection.socket || connection.socket.readyState !== WebSocket.OPEN) return;

          const ch0 = e.inputBuffer.getChannelData(0); // Remote (Customer)
          const ch1 = e.inputBuffer.getChannelData(1); // Mic (Agent)

          // Interleave: [Ch0_0, Ch1_0, Ch0_1, Ch1_1, ...]
          const int16 = new Int16Array(ch0.length * 2);
          for (let i = 0; i < ch0.length; i++) {
            const c0 = Math.max(-1, Math.min(1, ch0[i]));
            const c1 = Math.max(-1, Math.min(1, ch1[i]));
            int16[i * 2]     = c0 < 0 ? c0 * 0x8000 : c0 * 0x7fff;
            int16[i * 2 + 1] = c1 < 0 ? c1 * 0x8000 : c1 * 0x7fff;
          }
          connection.socket.send(int16.buffer);
          packetCount++;
          if (packetCount === 1) console.log("[LiveTranscript] 🎤 First stereo packet sent (L=agent, R=customer)");
        };

        merger.connect(processor);
        processor.connect(silentGain); // silent — avoids mic feedback
      } else {
        // ── MONO FALLBACK: mic only ──
        processor = audioCtx.createScriptProcessor(4096, 1, 1);
        let packetCount = 0;

        processor.onaudioprocess = (e) => {
          if (!connection.socket || connection.socket.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          connection.socket.send(int16.buffer);
          packetCount++;
          if (packetCount === 1) console.log("[LiveTranscript] 🎤 First mono packet sent (agent only)");
        };

        micSource.connect(processor);
        processor.connect(silentGain);
      }

      set({
        isListening: true,
        transcript: [],
        error: null,
        _connection: connection,
        _stream: micStream,
        _audioCtx: audioCtx,
        _processor: processor,
      });
    } catch (err) {
      console.error("[LiveTranscript] startListening error:", err);
      set({ error: err.message || "Mic access denied", isListening: false });
    }
  },

  stopListening: () => {
    const { _connection, _stream, _processor, _audioCtx } = get();
    try { _connection?.socket?.close(1000, "Call ended"); } catch (_) {}
    if (_stream) _stream.getTracks().forEach((t) => t.stop());
    try { _processor?.disconnect(); } catch (_) {}
    try { _audioCtx?.close(); } catch (_) {}

    set({
      isListening: false,
      _connection: null,
      _stream: null,
      _processor: null,
      _audioCtx: null,
    });
  },

  clearTranscript: () => set({ transcript: [], error: null }),
}));
