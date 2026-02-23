import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FractalChartCanvas } from "./FractalChartCanvas";

/**
 * STEP A — Hybrid Projection Chart (MVP)
 * BLOCK 73.4 — Interactive Match Replay
 * BLOCK 73.5.2 — Phase Click Drilldown
 * 
 * Shows both projections on same chart:
 * - Synthetic (green) - model forecast
 * - Replay (purple) - selected historical match aftermath
 * 
 * User can click on match chips to switch replay line
 * User can click on phase zones to filter matches by phase type
 */

export function FractalHybridChart({ 
  symbol = "BTC", 
  width = 1100, 
  height = 420,
  focus = '30d',
  focusPack = null,
  // BLOCK 73.5.2: Callback to refetch focusPack with phaseId
  onPhaseFilter
}) {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // BLOCK 73.4: Selected match state
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [customReplayPack, setCustomReplayPack] = useState(null);
  const [replayLoading, setReplayLoading] = useState(false);
  
  // BLOCK 73.5.2: Selected phase state
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const [selectedPhaseStats, setSelectedPhaseStats] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch chart data (candles, sma200, phases)
  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(`${API_URL}/api/fractal/v2.1/chart?symbol=${symbol}&limit=365`)
      .then(r => r.json())
      .then(chartData => {
        if (alive) {
          setChart(chartData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [symbol, API_URL]);
  
  // Reset selection when focus changes
  useEffect(() => {
    setSelectedMatchId(null);
    setCustomReplayPack(null);
    setSelectedPhaseId(null);
    setSelectedPhaseStats(null);
  }, [focus]);
  
  // BLOCK 73.5.2: Handle phase click drilldown
  const handlePhaseClick = useCallback((phaseId, phaseStats) => {
    console.log('[PhaseClick]', phaseId, phaseStats);
    
    if (!phaseId) {
      // Clear phase filter
      setSelectedPhaseId(null);
      setSelectedPhaseStats(null);
      if (onPhaseFilter) {
        onPhaseFilter(null);
      }
      return;
    }
    
    setSelectedPhaseId(phaseId);
    setSelectedPhaseStats(phaseStats);
    
    // Notify parent to refetch focusPack with phaseId filter
    if (onPhaseFilter) {
      onPhaseFilter(phaseId);
    }
  }, [onPhaseFilter]);
  
  // BLOCK 73.4: Fetch replay pack when user selects a match
  const handleMatchSelect = useCallback(async (matchId) => {
    if (!matchId || matchId === selectedMatchId) return;
    
    setSelectedMatchId(matchId);
    setReplayLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/fractal/v2.1/replay-pack?symbol=${symbol}&focus=${focus}&matchId=${matchId}`);
      const data = await res.json();
      
      if (data.ok && data.replayPack) {
        setCustomReplayPack(data.replayPack);
      }
    } catch (err) {
      console.error('[ReplayPack] Fetch error:', err);
    } finally {
      setReplayLoading(false);
    }
  }, [API_URL, symbol, focus, selectedMatchId]);

  // Build forecast from focusPack
  const forecast = useMemo(() => {
    const candles = chart?.candles;
    if (!candles?.length) return null;
    if (!focusPack?.forecast) return null;

    const currentPrice = candles[candles.length - 1].c;
    const fp = focusPack.forecast;
    const meta = focusPack.meta;
    const overlay = focusPack.overlay;
    
    const aftermathDays = meta?.aftermathDays || 30;
    const markers = fp.markers || [];
    
    // Get distribution series
    const distributionSeries = overlay?.distributionSeries || {};
    const lastIdx = (distributionSeries.p50?.length || 1) - 1;
    const distribution7d = {
      p10: distributionSeries.p10?.[lastIdx] ?? -0.15,
      p25: distributionSeries.p25?.[lastIdx] ?? -0.05,
      p50: distributionSeries.p50?.[lastIdx] ?? 0,
      p75: distributionSeries.p75?.[lastIdx] ?? 0.05,
      p90: distributionSeries.p90?.[lastIdx] ?? 0.15,
    };
    
    return {
      pricePath: fp.path || [],
      upperBand: fp.upperBand || [],
      lowerBand: fp.lowerBand || [],
      tailFloor: fp.tailFloor,
      confidenceDecay: fp.confidenceDecay || [],
      markers: markers.map(m => ({
        day: m.dayIndex + 1,
        horizon: m.horizon,
        price: m.price,
        expectedReturn: m.expectedReturn
      })),
      aftermathDays,
      currentPrice,
      distribution7d,
      stats: overlay?.stats || {}
    };
  }, [chart, focusPack]);
  
  // Get primary replay match - BLOCK 73.1: Use weighted primaryMatch
  // BLOCK 73.4: Override with custom replay pack if selected
  const primaryMatch = useMemo(() => {
    if (!chart?.candles?.length) return null;
    
    const currentPrice = chart.candles[chart.candles.length - 1].c;
    
    // BLOCK 73.4: Use custom replay pack if user selected a match
    if (customReplayPack) {
      return {
        id: customReplayPack.matchId,
        date: customReplayPack.matchMeta.date,
        similarity: customReplayPack.matchMeta.similarity,
        phase: customReplayPack.matchMeta.phase,
        replayPath: customReplayPack.replayPath.slice(1).map(p => p.price), // Skip t=0
        selectionScore: customReplayPack.matchMeta.score / 100,
        selectionReason: 'User selected',
        // Custom divergence for this match
        customDivergence: customReplayPack.divergence
      };
    }
    
    // BLOCK 73.1: Prefer primarySelection.primaryMatch from backend
    const match = focusPack?.primarySelection?.primaryMatch 
      || focusPack?.overlay?.matches?.[0]; // Fallback for backward compat
    
    if (!match?.aftermathNormalized?.length) return null;
    
    // Convert normalized aftermath to price series
    const replayPath = match.aftermathNormalized.map(r => currentPrice * (1 + r));
    
    return {
      id: match.id,
      date: match.date,
      similarity: match.similarity || 0.75,
      phase: match.phase,
      replayPath,
      // BLOCK 73.1: Include selection metadata
      selectionScore: match.selectionScore,
      selectionReason: match.selectionReason,
      scores: match.scores,
      // For future divergence calculation
      returns: match.aftermathNormalized
    };
  }, [focusPack, chart, customReplayPack]);
  
  // BLOCK 73.4: Get divergence - use custom if available
  const activeDivergence = useMemo(() => {
    if (customReplayPack?.divergence) {
      return customReplayPack.divergence;
    }
    return focusPack?.divergence;
  }, [focusPack, customReplayPack]);
  
  // BLOCK 73.5.2: Get phase filter info from focusPack
  const phaseFilter = focusPack?.phaseFilter;

  if (loading || !chart?.candles) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888' }}>Loading hybrid projection...</div>
      </div>
    );
  }

  const currentPrice = chart.candles[chart.candles.length - 1].c || 0;
  const matches = focusPack?.overlay?.matches || [];
  const primaryMatchId = focusPack?.primarySelection?.primaryMatch?.id || matches[0]?.id;

  return (
    <div style={{ width, background: "#fff", borderRadius: 12, overflow: "hidden" }}>
      {/* BLOCK 73.5.2: Phase Filter Indicator */}
      {phaseFilter?.active && (
        <PhaseFilterBar 
          phaseFilter={phaseFilter}
          phaseStats={selectedPhaseStats}
          onClear={() => handlePhaseClick(null)}
        />
      )}
      
      {/* Chart Canvas with hybrid mode */}
      <FractalChartCanvas 
        chart={chart} 
        forecast={forecast} 
        focus={focus}
        mode="hybrid"
        primaryMatch={primaryMatch}
        normalizedSeries={focusPack?.normalizedSeries}
        width={width} 
        height={height}
        // BLOCK 73.5.2: Phase click handler
        onPhaseClick={handlePhaseClick}
        selectedPhaseId={selectedPhaseId}
      />
      
      {/* BLOCK 73.4: Interactive Match Picker */}
      {matches.length > 1 && (
        <MatchPicker 
          matches={matches}
          selectedId={selectedMatchId || primaryMatchId}
          primaryId={primaryMatchId}
          onSelect={handleMatchSelect}
          loading={replayLoading}
        />
      )}
      
      {/* Hybrid Summary Panel */}
      <HybridSummaryPanel 
        forecast={forecast}
        primaryMatch={primaryMatch}
        currentPrice={currentPrice}
        focus={focus}
        divergence={activeDivergence}
      />
    </div>
  );
}

/**
 * Tooltip Component - Simple hover tooltip
 */
function Tooltip({ children, text }) {
  return (
    <span 
      className="cursor-help relative group"
      title={text}
    >
      {children}
    </span>
  );
}

/**
 * BLOCK 73.2 — Hybrid Summary Panel (INVESTOR-FRIENDLY)
 * Clean, compact, human-readable - NO borders, NO dev-style elements
 */
function HybridSummaryPanel({ forecast, primaryMatch, currentPrice, focus, divergence }) {
  if (!forecast || !currentPrice) return null;
  
  const syntheticEndPrice = forecast.pricePath?.length 
    ? forecast.pricePath[forecast.pricePath.length - 1]
    : currentPrice;
  const syntheticReturn = ((syntheticEndPrice - currentPrice) / currentPrice * 100);
    
  const replayEndPrice = primaryMatch?.replayPath?.length
    ? primaryMatch.replayPath[primaryMatch.replayPath.length - 1]
    : null;
  const replayReturn = replayEndPrice
    ? ((replayEndPrice - currentPrice) / currentPrice * 100)
    : null;
  
  const div = divergence || {};
  const score = div.score ?? null;
  
  const formatPrice = (p) => {
    if (!p || isNaN(p)) return '—';
    if (p >= 1000) return `$${(p / 1000).toFixed(1)}K`;
    return `$${p.toFixed(0)}`;
  };

  const horizonDays = focus.replace('d', '');

  // Calculate human-readable metrics
  const patternSimilarity = div.corr ? Math.round(div.corr * 100) : null;
  const directionalAlignment = div.directionalMismatch != null ? Math.round(100 - div.directionalMismatch) : null;
  const projectionGap = div.terminalDelta != null ? Math.round(div.terminalDelta) : null;
  const hasTerminalDrift = div.flags?.includes('TERM_DRIFT');

  return (
    <div className="bg-white p-4 mt-2" data-testid="hybrid-summary-panel">
      {/* Section Title */}
      <h2 className="text-base font-semibold text-slate-800 mb-3">
        <Tooltip text="Combined projection using AI model analysis and historical pattern replay">
          Hybrid Projection ({horizonDays}D)
        </Tooltip>
        {score !== null && (
          <span className="ml-3 text-sm font-normal text-slate-500">
            <Tooltip text="Overall quality score (0-100) combining pattern similarity, volatility alignment, and structural match. Higher is better.">
              Quality: {score} / 100
            </Tooltip>
          </span>
        )}
      </h2>
      
      {/* Compact Projections - List format */}
      <div className="space-y-1 mb-4">
        {/* Model Projection */}
        <div className="flex items-center gap-2">
          <Tooltip text="AI model's synthetic projection based on current market structure, momentum, and volatility patterns">
            <span className="text-sm text-slate-600 w-14">Model:</span>
          </Tooltip>
          <span className={`text-sm font-semibold ${syntheticReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {syntheticReturn >= 0 ? '+' : ''}{syntheticReturn.toFixed(1)}%
          </span>
          <span className="text-sm text-slate-500">→ {formatPrice(syntheticEndPrice)}</span>
        </div>
        
        {/* Replay Projection */}
        <div className="flex items-center gap-2">
          <Tooltip text={`Historical outcome: What actually happened ${horizonDays} days after similar market conditions in the past`}>
            <span className="text-sm text-slate-600 w-14">Replay:</span>
          </Tooltip>
          {replayReturn !== null ? (
            <>
              <span className={`text-sm font-semibold ${replayReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {replayReturn >= 0 ? '+' : ''}{replayReturn.toFixed(1)}%
              </span>
              <span className="text-sm text-slate-500">→ {formatPrice(replayEndPrice)}</span>
            </>
          ) : (
            <span className="text-sm text-slate-400">No data</span>
          )}
        </div>
      </div>
      
      {/* Model vs History - Human-readable metrics */}
      {divergence && (
        <div className="pt-3 border-t border-slate-100">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            <Tooltip text="How well the AI model agrees with historical pattern behavior">
              Model vs History
            </Tooltip>
          </h3>
          
          <div className="space-y-1 text-sm">
            {/* Pattern Similarity */}
            {patternSimilarity !== null && (
              <div className="flex items-center gap-2">
                <Tooltip text="How closely the current price structure matches the historical pattern. Higher percentage means stronger resemblance.">
                  <span className="text-slate-600">Pattern Similarity:</span>
                </Tooltip>
                <span className={`font-medium ${patternSimilarity >= 50 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {patternSimilarity}%
                </span>
              </div>
            )}
            
            {/* Directional Alignment */}
            {directionalAlignment !== null && (
              <div className="flex items-center gap-2">
                <Tooltip text="Percentage of time when both model and history agree on price direction (up vs down). Higher is better.">
                  <span className="text-slate-600">Directional Alignment:</span>
                </Tooltip>
                <span className={`font-medium ${directionalAlignment >= 60 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {directionalAlignment}%
                </span>
              </div>
            )}
            
            {/* Projection Gap */}
            {projectionGap !== null && (
              <div className="flex items-center gap-2">
                <Tooltip text="Difference between where the model predicts price will be and where history suggests it will be. Closer to 0% means better agreement.">
                  <span className="text-slate-600">Projection Gap:</span>
                </Tooltip>
                <span className={`font-medium ${Math.abs(projectionGap) > 15 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {projectionGap >= 0 ? '+' : ''}{projectionGap}%
                </span>
              </div>
            )}
            
            {/* Terminal Drift Warning */}
            {hasTerminalDrift && (
              <div className="flex items-center gap-2 mt-2 text-amber-600">
                <Tooltip text="The model and historical pattern started similar but are now diverging significantly. Late-stage predictions may be less reliable.">
                  <span className="text-xs italic">Late-stage divergence detected</span>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * BLOCK 73.4 — Interactive Match Picker (INVESTOR-FRIENDLY)
 * Clean list format: "2012-07-07 · 65% · Distribution"
 * No borders, no numbering, minimal styling
 */

const PHASE_MAP = {
  ACC: { label: 'Accumulation' },
  ACCUMULATION: { label: 'Accumulation' },
  DIS: { label: 'Distribution' },
  DISTRIBUTION: { label: 'Distribution' },
  REC: { label: 'Recovery' },
  RECOVERY: { label: 'Recovery' },
  MAR: { label: 'Markdown' },
  MARKDOWN: { label: 'Markdown' },
  MARKUP: { label: 'Markup' },
  CAPITULATION: { label: 'Capitulation' },
};

function getPhaseLabel(phase) {
  return PHASE_MAP[phase]?.label || phase || 'Unknown';
}

function MatchPicker({ matches, selectedId, primaryId, onSelect, loading }) {
  const topMatches = matches.slice(0, 5);
  
  return (
    <div className="px-4 py-3 bg-white" data-testid="match-picker">
      {/* Section Title */}
      <h3 className="text-sm font-medium text-slate-700 mb-2">
        <Tooltip text="Historical periods with similar market conditions. Click to see what happened after each pattern.">
          Historical Matches
        </Tooltip>
        {loading && <span className="ml-2 text-xs text-violet-500 italic">(loading...)</span>}
      </h3>
      
      {/* Match list - clean, no borders */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {topMatches.map((match, idx) => {
          const isSelected = match.id === selectedId;
          const phaseLabel = getPhaseLabel(match.phase);
          const similarity = Math.round((match.similarity || 0) * 100);
          
          return (
            <button
              key={match.id}
              data-testid={`match-chip-${idx}`}
              onClick={() => onSelect(match.id)}
              className={`
                text-sm py-1 px-0 bg-transparent cursor-pointer transition-colors
                ${isSelected 
                  ? 'text-slate-900 font-semibold' 
                  : 'text-slate-500 hover:text-slate-700'}
              `}
              title={`Click to replay this historical pattern`}
            >
              {match.id} · {similarity}% · {phaseLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * BLOCK 73.5.2 — Phase Filter Bar
 * Clean indicator when phase filter is active
 */
function PhaseFilterBar({ phaseFilter, phaseStats, onClear }) {
  if (!phaseFilter?.active) return null;
  
  const phaseLabel = getPhaseLabel(phaseFilter.phaseType);
  
  return (
    <div 
      className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200"
      data-testid="phase-filter-bar"
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-slate-700">
          Filtered by: {phaseLabel}
        </span>
        <span className="text-slate-500">
          {phaseFilter.filteredMatchCount} matches
        </span>
        {phaseStats && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">
              Avg: <span className={phaseStats.phaseReturnPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {phaseStats.phaseReturnPct >= 0 ? '+' : ''}{phaseStats.phaseReturnPct?.toFixed(1)}%
              </span>
            </span>
          </>
        )}
      </div>
      
      <button
        onClick={onClear}
        data-testid="clear-phase-filter"
        className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        Clear
      </button>
    </div>
  );
}

export default FractalHybridChart;
