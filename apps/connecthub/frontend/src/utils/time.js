// utils/time.js
import { useEffect, useState } from "react";

export function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function parseTimestamp(ts) {
  if (!ts && ts !== 0) return null;
  if (typeof ts === "number") return ts;

  if (typeof ts === "string") {
    const trimmed = ts.trim();
    if (trimmed.includes("T")) {
      const t = Date.parse(trimmed);
      return Number.isNaN(t) ? null : t;
    }
    const isoLike = trimmed.replace(" ", "T"); // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
    const t = Date.parse(isoLike);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}
