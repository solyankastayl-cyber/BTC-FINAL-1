/**
 * BLOCK 70.2 STEP 2 — useFocusPack Hook
 * BLOCK 73.5.2 — Phase Filter Support
 * BLOCK U2 — As-of Date + Simulation Mode
 * 
 * Real horizon binding for frontend.
 * - AbortController for request cancellation
 * - Caches last good payload
 * - Loading/error states
 * - Phase filtering support
 * - As-of date support for simulation mode
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// Horizon metadata
export const HORIZONS = [
  { key: '7d',   label: '7D',   tier: 'TIMING',    color: '#3B82F6' },
  { key: '14d',  label: '14D',  tier: 'TIMING',    color: '#3B82F6' },
  { key: '30d',  label: '30D',  tier: 'TACTICAL',  color: '#8B5CF6' },
  { key: '90d',  label: '90D',  tier: 'TACTICAL',  color: '#8B5CF6' },
  { key: '180d', label: '180D', tier: 'STRUCTURE', color: '#EF4444' },
  { key: '365d', label: '365D', tier: 'STRUCTURE', color: '#EF4444' },
];

export const getTierColor = (tier) => {
  switch (tier) {
    case 'TIMING': return '#3B82F6';
    case 'TACTICAL': return '#8B5CF6';
    case 'STRUCTURE': return '#EF4444';
    default: return '#6B7280';
  }
};

export const getTierLabel = (tier) => {
  switch (tier) {
    case 'TIMING': return 'Timing View';
    case 'TACTICAL': return 'Tactical View';
    case 'STRUCTURE': return 'Structure View';
    default: return 'Analysis View';
  }
};

/**
 * useFocusPack - Fetches focus-specific terminal data
 * BLOCK 73.5.2: Added phaseId parameter for phase filtering
 * BLOCK U2: Added asOf parameter for simulation mode
 * UNIFIED: Added asset parameter for multi-asset support
 * 
 * @param {string} symbol - Trading symbol (BTC, SPX)
 * @param {string} focus - Horizon focus ('7d'|'14d'|'30d'|'90d'|'180d'|'365d')
 * @param {object} options - { phaseId, asOf, mode }
 * @returns {{ data, loading, error, refetch, setPhaseId, setAsOf }}
 */
export function useFocusPack(symbol = 'BTC', focus = '30d', options = {}) {
  const { initialPhaseId = null, initialAsOf = null } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phaseId, setPhaseIdState] = useState(initialPhaseId);
  const [asOf, setAsOfState] = useState(initialAsOf); // BLOCK U2: As-of date
  const [mode, setMode] = useState('auto'); // 'auto' = live, 'simulation' = historical
  const abortControllerRef = useRef(null);
  const cacheRef = useRef({}); // Cache by focus key
  
  const fetchFocusPack = useCallback(async (overridePhaseId, overrideAsOf) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    const currentPhaseId = overridePhaseId !== undefined ? overridePhaseId : phaseId;
    const currentAsOf = overrideAsOf !== undefined ? overrideAsOf : asOf;
    
    // Check cache first (only for non-filtered requests)
    const cacheKey = `${symbol}_${focus}_${currentPhaseId || 'all'}_${currentAsOf || 'latest'}`;
    if (cacheRef.current[cacheKey] && !currentPhaseId) {
      setData(cacheRef.current[cacheKey]);
      // Still fetch fresh data in background
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // UNIFIED: Use different endpoints for BTC vs SPX
      let url;
      if (symbol === 'SPX') {
        // SPX uses new unified endpoint
        url = `${API_BASE}/api/fractal/spx?focus=${focus}`;
        if (currentAsOf) {
          url += `&asOf=${encodeURIComponent(currentAsOf)}`;
        }
      } else {
        // BTC uses legacy endpoint
        url = `${API_BASE}/api/fractal/v2.1/focus-pack?symbol=${symbol}&focus=${focus}`;
        if (currentPhaseId) {
          url += `&phaseId=${encodeURIComponent(currentPhaseId)}`;
        }
        if (currentAsOf) {
          url += `&asOf=${encodeURIComponent(currentAsOf)}`;
        }
      }
      
      const response = await fetch(url, { signal });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // UNIFIED: Handle both response formats
      if (symbol === 'SPX' && result.ok && result.data) {
        // SPX returns { ok, data: FractalSignalContract }
        // Transform to focusPack format for compatibility
        const spxData = transformSpxToFocusPack(result.data, focus);
        cacheRef.current[cacheKey] = spxData;
        setData(spxData);
        setError(null);
      } else if (result.ok && result.focusPack) {
        // BTC format
        cacheRef.current[cacheKey] = result.focusPack;
        setData(result.focusPack);
        setError(null);
      } else {
        throw new Error(result.error || 'Invalid response');
      }
      
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }
      console.error('[useFocusPack] Error:', err);
      setError(err.message);
      // Keep cached data if available
      if (!cacheRef.current[cacheKey]) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, focus, phaseId, asOf]);
  
  // BLOCK 73.5.2: Refetch with new phaseId
  const filterByPhase = useCallback((newPhaseId) => {
    setPhaseIdState(newPhaseId);
    fetchFocusPack(newPhaseId);
  }, [fetchFocusPack]);
  
  // BLOCK U2: Set as-of date
  const setAsOf = useCallback((newAsOf) => {
    setAsOfState(newAsOf);
    setMode(newAsOf ? 'simulation' : 'auto');
    fetchFocusPack(undefined, newAsOf);
  }, [fetchFocusPack]);
  
  useEffect(() => {
    fetchFocusPack();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFocusPack]);
  
  // Reset phaseId when focus changes
  useEffect(() => {
    setPhaseIdState(null);
  }, [focus]);
  
  return {
    data,
    loading,
    error,
    refetch: fetchFocusPack,
    // BLOCK 73.5.2: Phase filter controls
    phaseId,
    setPhaseId: filterByPhase,
    phaseFilter: data?.phaseFilter,
    // BLOCK U2: As-of date controls
    asOf,
    setAsOf,
    mode,
    setMode,
    // Computed helpers
    meta: data?.meta,
    overlay: data?.overlay,
    forecast: data?.forecast,
    diagnostics: data?.diagnostics,
    tier: data?.meta?.tier,
    aftermathDays: data?.meta?.aftermathDays,
    matchesCount: data?.overlay?.matches?.length || 0,
    // U6: Scenario pack
    scenario: data?.scenario,
  };
}

export default useFocusPack;
