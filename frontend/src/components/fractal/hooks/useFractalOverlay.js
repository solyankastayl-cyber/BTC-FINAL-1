/**
 * useFractalOverlay — Fetches fractal overlay data for Replay mode
 * FIXED: Now includes horizonDays in the request key
 */
import { useEffect, useState, useCallback } from "react";

// Map focus string to days
const focusToDays = (focus) => {
  const match = focus?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 30;
};

export function useFractalOverlay(symbol, focus = '30d') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';
  const horizonDays = focusToDays(focus);

  // Reset selected match when horizon changes
  useEffect(() => {
    setSelectedMatchId(null);
  }, [horizonDays]);

  // Fetch overlay data
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    // FIXED: windowLen for match search is capped at 90 (engine limitation)
    // But we use displayWindow (=horizonDays) for the chart display
    // This allows symmetric chart while using valid window sizes for pattern matching
    const matchWindowLen = Math.min(90, Math.max(30, horizonDays));
    const displayWindowLen = horizonDays; // For chart display (can be 365)
    const url = `${API_URL}/api/fractal/v2.1/overlay?symbol=${encodeURIComponent(symbol)}&horizon=${horizonDays}&windowLen=${matchWindowLen}&displayWindow=${displayWindowLen}&topK=10&aftermathDays=${horizonDays}`;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`overlay ${r.status}`);
        return await r.json();
      })
      .then((json) => {
        if (!alive) return;
        setData(json);
        
        // Auto-select first match if none selected or current doesn't exist
        if (json?.matches?.length) {
          const stillExists = selectedMatchId && json.matches.some(m => m.id === selectedMatchId);
          if (!stillExists) {
            setSelectedMatchId(json.matches[0].id);
          }
        }
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "overlay fetch failed");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [symbol, horizonDays, API_URL]);

  // Get match index by ID
  const matchIndex = data?.matches?.findIndex(m => m.id === selectedMatchId) ?? 0;
  
  // Select match handler
  const selectMatch = useCallback((id) => {
    setSelectedMatchId(id);
  }, []);

  return { 
    data, 
    loading, 
    err, 
    horizonDays,
    selectedMatchId,
    matchIndex: Math.max(0, matchIndex),
    selectMatch,
    setMatchIndex: (idx) => {
      if (data?.matches?.[idx]) {
        setSelectedMatchId(data.matches[idx].id);
      }
    }
  };
}
