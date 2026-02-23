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
 * BLOCK 73.4 — Interactive Match Picker
 */

const PHASE_MAP = {
  ACC: { label: 'Accumulation', bgColor: '#dbeafe', textColor: '#1d4ed8' },
  ACCUMULATION: { label: 'Accumulation', bgColor: '#dbeafe', textColor: '#1d4ed8' },
  DIS: { label: 'Distribution', bgColor: '#fef3c7', textColor: '#b45309' },
  DISTRIBUTION: { label: 'Distribution', bgColor: '#fef3c7', textColor: '#b45309' },
  REC: { label: 'Recovery', bgColor: '#dcfce7', textColor: '#166534' },
  RECOVERY: { label: 'Recovery', bgColor: '#dcfce7', textColor: '#166534' },
  MAR: { label: 'Markdown', bgColor: '#fee2e2', textColor: '#dc2626' },
  MARKDOWN: { label: 'Markdown', bgColor: '#fee2e2', textColor: '#dc2626' },
  MARKUP: { label: 'Markup', bgColor: '#d1fae5', textColor: '#059669' },
};

function getPhaseInfo(phase) {
  return PHASE_MAP[phase] || { label: phase, bgColor: '#f4f4f5', textColor: '#52525b' };
}

function MatchPicker({ matches, selectedId, primaryId, onSelect, loading }) {
  const topMatches = matches.slice(0, 5);
  
  return (
    <div style={matchPickerStyles.container} data-testid="match-picker">
      {/* Header */}
      <div style={matchPickerStyles.header}>
        <span style={matchPickerStyles.labelText}>
          Historical Matches {loading && <span style={matchPickerStyles.loading}>(loading...)</span>}
        </span>
      </div>
      
      {/* Match chips - compact */}
      <div style={matchPickerStyles.chips}>
        {topMatches.map((match, idx) => {
          const isSelected = match.id === selectedId;
          const isPrimary = match.id === primaryId;
          const phaseInfo = getPhaseInfo(match.phase);
          
          return (
            <button
              key={match.id}
              data-testid={`match-chip-${idx}`}
              onClick={() => onSelect(match.id)}
              title={`${match.id} · ${(match.similarity * 100).toFixed(0)}% similarity · ${phaseInfo.label} phase${isPrimary ? ' · Best match' : ''}`}
              style={{
                ...matchPickerStyles.chip,
                backgroundColor: isSelected ? '#1f2937' : (isPrimary ? '#f0fdf4' : '#fff'),
                color: isSelected ? '#fff' : '#1f2937',
                borderColor: isSelected ? '#1f2937' : (isPrimary ? '#22c55e' : '#e5e7eb'),
              }}
            >
              <span style={matchPickerStyles.chipRank}>#{idx + 1}</span>
              <span style={matchPickerStyles.chipDate}>{match.id}</span>
              <span style={{
                ...matchPickerStyles.chipSim,
                color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280'
              }}>
                {(match.similarity * 100).toFixed(0)}%
              </span>
              {isPrimary && !isSelected && (
                <span style={matchPickerStyles.primaryBadge}>Best</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const matchPickerStyles = {
  container: {
    padding: '10px 14px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
  },
  header: {
    marginBottom: 8,
  },
  labelText: {
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
  },
  loading: {
    fontSize: 10,
    color: '#8b5cf6',
    fontStyle: 'italic',
    marginLeft: 6,
  },
  chips: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    border: '1px solid',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  chipRank: {
    fontWeight: 700,
    fontSize: 10,
    color: '#6b7280',
  },
  chipDate: {
    fontSize: 10,
    fontWeight: 500,
  },
  chipSim: {
    fontSize: 10,
  },
  primaryBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    fontSize: 7,
    padding: '1px 4px',
    backgroundColor: '#22c55e',
    color: '#fff',
    borderRadius: 3,
    fontWeight: 600,
  },
};

/**
 * BLOCK 73.5.2 — Phase Filter Bar
 * 
 * Shows when a phase is selected (clicked).
 * Displays phase context and clear button.
 */
function PhaseFilterBar({ phaseFilter, phaseStats, onClear }) {
  if (!phaseFilter?.active) return null;
  
  const phaseInfo = PHASE_MAP[phaseFilter.phaseType] || { label: phaseFilter.phaseType, bgColor: '#f4f4f5', textColor: '#52525b' };
  
  const phaseColors = {
    'ACCUMULATION': { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
    'MARKUP': { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
    'DISTRIBUTION': { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
    'MARKDOWN': { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
    'RECOVERY': { bg: '#cffafe', border: '#06b6d4', text: '#0891b2' },
    'CAPITULATION': { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' },
  };
  
  const colors = phaseColors[phaseFilter.phaseType] || { bg: '#f4f4f5', border: '#a1a1aa', text: '#52525b' };
  
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        backgroundColor: colors.bg,
        borderBottom: `2px solid ${colors.border}`,
      }}
      data-testid="phase-filter-bar"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          backgroundColor: colors.border,
          color: '#fff',
          padding: '5px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {phaseInfo.label}
        </span>
        <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>
          Phase Filter Active
        </span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {phaseFilter.filteredMatchCount} matches in {phaseInfo.label.toLowerCase()} phase
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {phaseStats && (
          <span style={{ fontSize: 12, color: '#4b5563' }}>
            Avg Return: <span style={{ 
              fontWeight: 600, 
              color: phaseStats.phaseReturnPct >= 0 ? '#16a34a' : '#dc2626' 
            }}>
              {phaseStats.phaseReturnPct >= 0 ? '+' : ''}{phaseStats.phaseReturnPct?.toFixed(1)}%
            </span>
            <span style={{ color: '#9ca3af', margin: '0 6px' }}>|</span>
            Avg Duration: {phaseStats.durationDays}d
          </span>
        )}
        <button
          onClick={onClear}
          data-testid="clear-phase-filter"
          style={{
            padding: '6px 14px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => { e.target.style.backgroundColor = '#f3f4f6'; }}
          onMouseOut={(e) => { e.target.style.backgroundColor = '#fff'; }}
        >
          Clear Filter
        </button>
      </div>
    </div>
  );
}

export default FractalHybridChart;
