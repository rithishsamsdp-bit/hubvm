// hooks/useGender.js
// Fetches gender from genderize.io by first name.
// Persists the results in localStorage to avoid redundant API calls after refresh.

import { useState, useEffect } from "react";

const STORAGE_KEY = "connecthub_gender_cache";

/* ── Helper: Load cache from localStorage ── */
const loadCache = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? new Map(JSON.parse(saved)) : new Map();
  } catch (e) {
    return new Map();
  }
};

/* ── Helper: Save cache to localStorage ── */
const saveCache = (map) => {
  try {
    const data = JSON.stringify(Array.from(map.entries()));
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    // Ignore storage errors
  }
};

/* ── Module-level cache (persists during the session) ── */
let genderCache = loadCache();
const pendingRequests = new Map(); // name -> Promise (dedup in-flight requests)

/**
 * Given a full display name, extracts the first name, calls genderize.io,
 * and returns the gender string: "male" | "female" | "unknown".
 * Results are stored in localStorage for persistence across refreshes.
 */
export const useGender = (fullName) => {
  const firstName = fullName?.trim().split(/\s+/)[0]?.toLowerCase() || "";
  const [gender, setGender] = useState(() => genderCache.get(firstName) ?? null);

  useEffect(() => {
    if (!firstName) {
      setGender("unknown");
      return;
    }

    // Already cached
    if (genderCache.has(firstName)) {
      setGender(genderCache.get(firstName));
      return;
    }

    // Dedup: reuse in-flight promise if already fetching this name
    if (!pendingRequests.has(firstName)) {
      const promise = fetch(`https://api.genderize.io/?name=${encodeURIComponent(firstName)}`)
        .then(r => r.json())
        .then(data => {
          const resolved = data?.gender || "unknown";
          // Update memory cache
          genderCache.set(firstName, resolved);
          // Update persistent storage
          saveCache(genderCache);
          return resolved;
        })
        .catch(() => {
          genderCache.set(firstName, "unknown");
          saveCache(genderCache);
          return "unknown";
        })
        .finally(() => {
          pendingRequests.delete(firstName);
        });
      pendingRequests.set(firstName, promise);
    }

    let cancelled = false;
    pendingRequests.get(firstName).then(resolved => {
      if (!cancelled) setGender(resolved);
    });

    return () => { cancelled = true; };
  }, [firstName]);

  return gender; // "male" | "female" | "unknown" | null (loading)
};
