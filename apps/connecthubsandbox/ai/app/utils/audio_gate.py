"""
Audio Energy Gate — local RMS-based noise gate for filtering background noise
before audio is forwarded to the AI provider.

This module acts as the FIRST line of defence against background voices and
ambient noise.  It sits between the WebSocket audio input and the provider's
send_audio() call.

How it works:
  1. Each incoming audio chunk is decoded and its RMS energy is calculated.
  2. Only when the energy exceeds a configurable threshold AND stays above it
     for a minimum number of consecutive frames is the audio considered
     "active speech".
  3. A trailing-silence window keeps audio flowing for a short period after
     speech stops so words aren't clipped.
  4. All gated (rejected) frames are silently discarded — they never reach
     the AI provider.
"""

import base64
import math
import struct
import logging
from dataclasses import dataclass, field

logger = logging.getLogger("audio_gate")

# ── Defaults ────────────────────────────────────────────────────────────────

# RMS thresholds (16-bit signed PCM, range 0–32767)
#   Browser mic ≈ 200-800 for normal speech, 50-150 for background
#   Telephony   ≈ 300-1200 for speech, 80-200 for line noise
DEFAULT_RMS_THRESHOLD_FRONTEND  = 180   # browser / pcm16 24kHz
DEFAULT_RMS_THRESHOLD_FREESWITCH = 400  # telephony / g711_ulaw 8kHz (line noise peaks ~318)

# Consecutive frames above threshold required to START forwarding
DEFAULT_ACTIVATION_FRAMES = 3

# How many silent frames to keep forwarding after speech stops
# (prevents clipping trailing syllables)
DEFAULT_TRAILING_FRAMES = 8

# Stats logging interval (every N frames)
STATS_LOG_INTERVAL = 500


@dataclass
class GateStats:
    """Running statistics for debugging / monitoring."""
    frames_received: int = 0
    frames_forwarded: int = 0
    frames_gated: int = 0
    peak_rms: float = 0.0
    activations: int = 0          # how many times gate opened

    def reset(self):
        self.frames_received = 0
        self.frames_forwarded = 0
        self.frames_gated = 0
        self.peak_rms = 0.0
        self.activations = 0


class AudioGate:
    """
    Stateful per-session audio gate.

    Usage:
        gate = AudioGate(source="freeswitch")
        ...
        if gate.should_forward(b64_audio_chunk):
            await provider.send_audio(b64_audio_chunk)
    """

    def __init__(
        self,
        source: str = "frontend",
        rms_threshold: float | None = None,
        activation_frames: int = DEFAULT_ACTIVATION_FRAMES,
        trailing_frames: int = DEFAULT_TRAILING_FRAMES,
    ):
        self.source = source

        # Pick default threshold based on source if not explicitly set
        if rms_threshold is not None:
            self.rms_threshold = rms_threshold
        elif source == "freeswitch":
            self.rms_threshold = DEFAULT_RMS_THRESHOLD_FREESWITCH
        else:
            self.rms_threshold = DEFAULT_RMS_THRESHOLD_FRONTEND

        self.activation_frames = activation_frames
        self.trailing_frames = trailing_frames

        # Internal state
        self._consecutive_loud: int = 0
        self._trailing_counter: int = 0
        self._gate_open: bool = False

        self.stats = GateStats()
        
    def process(self, b64_audio: str) -> str:
        """
        Analyse a base64-encoded audio chunk. If it's speech, return it
        unchanged. If it's noise, return a silence frame of the same size.

        This keeps the audio stream CONTINUOUS (required by OpenAI server VAD)
        while muting background noise.
        """
        if self.should_forward(b64_audio):
            return b64_audio
        else:
            # Replace with silence of the same byte length
            try:
                raw_bytes = base64.b64decode(b64_audio)
                if self.source == "freeswitch":
                    # g711_ulaw silence = 0xFF per byte
                    silence = bytes([0xFF] * len(raw_bytes))
                else:
                    # pcm16 silence = 0x00 per byte
                    silence = bytes(len(raw_bytes))
                return base64.b64encode(silence).decode("utf-8")
            except Exception:
                return b64_audio  # fail-open

    # ── Public API ──────────────────────────────────────────────────────────

    def should_forward(self, b64_audio: str) -> bool:
        """
        Analyse a base64-encoded audio chunk and decide whether it should be
        forwarded to the AI provider.

        Returns True  → forward this chunk (speech detected)
        Returns False → gate it (background noise)
        """
        self.stats.frames_received += 1

        try:
            raw_bytes = base64.b64decode(b64_audio)
            rms = self._compute_rms(raw_bytes)
        except Exception:
            # If we can't decode, let it through (fail-open)
            self.stats.frames_forwarded += 1
            return True

        # Track peak
        if rms > self.stats.peak_rms:
            self.stats.peak_rms = rms

        is_loud = rms >= self.rms_threshold

        if is_loud:
            self._consecutive_loud += 1

            # Open the gate only after enough consecutive loud frames
            if not self._gate_open and self._consecutive_loud >= self.activation_frames:
                self._gate_open = True
                self.stats.activations += 1
                logger.debug(
                    f"[GATE] OPENED — RMS={rms:.0f} threshold={self.rms_threshold} "
                    f"(activation #{self.stats.activations})"
                )

            # Only reset trailing timer when gate is actually open
            if self._gate_open:
                self._trailing_counter = self.trailing_frames
        else:
            self._consecutive_loud = 0

            if self._gate_open:
                self._trailing_counter -= 1
                if self._trailing_counter <= 0:
                    # Gate closes after trailing silence expires
                    self._gate_open = False
                    logger.debug(
                        f"[GATE] CLOSED — trailing silence expired "
                        f"(forwarded {self.stats.frames_forwarded}/{self.stats.frames_received})"
                    )

        # Decision: only forward when gate is open (includes trailing period)
        forward = self._gate_open

        if forward:
            self.stats.frames_forwarded += 1
        else:
            self.stats.frames_gated += 1

        # Periodic stats logging
        if self.stats.frames_received % STATS_LOG_INTERVAL == 0:
            self._log_stats()

        return forward

    def reset(self):
        """Reset gate state (e.g. on agent transfer)."""
        self._consecutive_loud = 0
        self._trailing_counter = 0
        self._gate_open = False
        self.stats.reset()

    # ── Internals ───────────────────────────────────────────────────────────

    def _compute_rms(self, raw_bytes: bytes) -> float:
        """
        Calculate RMS energy of an audio buffer.

        For g711_ulaw (FreeSWITCH): first decode µ-law → 16-bit PCM, then RMS.
        For pcm16 (frontend/browser): directly compute RMS on 16-bit samples.
        """
        if self.source == "freeswitch":
            # µ-law encoded — decode each byte to 16-bit PCM sample
            samples = [_ulaw_to_linear(b) for b in raw_bytes]
        else:
            # pcm16 — 16-bit little-endian signed
            num_samples = len(raw_bytes) // 2
            if num_samples == 0:
                return 0.0
            samples = list(struct.unpack(f"<{num_samples}h", raw_bytes[:num_samples * 2]))

        if not samples:
            return 0.0

        sum_sq = sum(s * s for s in samples)
        return math.sqrt(sum_sq / len(samples))

    def _log_stats(self):
        pct = (
            (self.stats.frames_forwarded / self.stats.frames_received * 100)
            if self.stats.frames_received > 0 else 0
        )
        logger.info(
            f"[GATE] Stats — received={self.stats.frames_received} "
            f"forwarded={self.stats.frames_forwarded} ({pct:.1f}%) "
            f"gated={self.stats.frames_gated} "
            f"peak_rms={self.stats.peak_rms:.0f} "
            f"activations={self.stats.activations}"
        )


# ── µ-law decode table (ITU-T G.711) ────────────────────────────────────────

# Pre-computed lookup table for µ-law → 16-bit linear PCM
_ULAW_DECODE_TABLE: list[int] = []


def _build_ulaw_table():
    """Build the µ-law to linear decode table (256 entries)."""
    BIAS = 0x84
    for i in range(256):
        val = ~i & 0xFF
        sign = val & 0x80
        exponent = (val >> 4) & 0x07
        mantissa = val & 0x0F
        sample = ((mantissa << 3) + BIAS) << exponent
        sample -= BIAS
        if sign:
            sample = -sample
        _ULAW_DECODE_TABLE.append(sample)


_build_ulaw_table()


def _ulaw_to_linear(ulaw_byte: int) -> int:
    """Decode a single µ-law byte to a 16-bit linear PCM sample."""
    return _ULAW_DECODE_TABLE[ulaw_byte & 0xFF]
