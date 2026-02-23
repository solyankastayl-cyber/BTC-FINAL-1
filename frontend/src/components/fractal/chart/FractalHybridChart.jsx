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
 * BLOCK 73.2 — Hybrid Summary Panel - COMPACT
 * Shows: Forecast (Model), Historical Replay, Agreement metrics
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

  return (
    <div style={styles.container} data-testid="hybrid-summary-panel">
      {/* Compact Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>Hybrid Projection</span>
          <span style={styles.horizonBadge}>{horizonDays}D</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.currentPrice}>NOW: {formatPrice(currentPrice)}</span>
          {score !== null && (
            <span style={styles.qualityBadge} title="Match quality based on similarity, stability, volatility alignment">
              Quality: {score}/100
            </span>
          )}
        </div>
      </div>

      {/* Compact 2-column Projection Grid */}
      <div style={styles.projectionGrid}>
        {/* Model Forecast */}
        <div style={styles.projectionBlock} title="AI model's synthetic projection based on current market structure">
          <div style={styles.blockHeader}>
            <span style={{ ...styles.dot, backgroundColor: '#22c55e' }}></span>
            <span style={styles.blockTitle}>Model</span>
          </div>
          <div style={{ ...styles.returnValue, color: syntheticReturn >= 0 ? '#22c55e' : '#ef4444' }}>
            {syntheticReturn >= 0 ? '+' : ''}{syntheticReturn.toFixed(1)}%
          </div>
          <div style={styles.targetPrice}>→ {formatPrice(syntheticEndPrice)}</div>
        </div>

        {/* Historical Replay */}
        <div style={styles.projectionBlock} title={`What happened ${horizonDays} days after similar historical patterns`}>
          <div style={styles.blockHeader}>
            <span style={{ ...styles.dot, backgroundColor: '#8b5cf6' }}></span>
            <span style={styles.blockTitle}>Replay</span>
          </div>
          {replayReturn !== null ? (
            <>
              <div style={{ ...styles.returnValue, color: replayReturn >= 0 ? '#22c55e' : '#ef4444' }}>
                {replayReturn >= 0 ? '+' : ''}{replayReturn.toFixed(1)}%
              </div>
              <div style={styles.targetPrice}>→ {formatPrice(replayEndPrice)}</div>
              <div style={styles.matchInfo}>{primaryMatch?.id} · {(primaryMatch?.similarity * 100).toFixed(0)}%</div>
            </>
          ) : (
            <div style={styles.noData}>No data</div>
          )}
        </div>
      </div>

      {/* Compact Agreement */}
      {divergence && <AgreementSection divergence={divergence} />}
    </div>
  );
}

/**
 * Agreement Section - Compact metrics with tooltips
 */
function AgreementSection({ divergence }) {
  const { rmse, corr, terminalDelta, directionalMismatch, samplePoints, flags } = divergence;
  
  const getAgreementLevel = () => {
    if (rmse <= 5 && corr >= 0.7) return { label: 'Strong', color: '#22c55e' };
    if (rmse <= 15 && corr >= 0.4) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Weak', color: '#ef4444' };
  };
  
  const agreement = getAgreementLevel();
  const hasWarnings = flags?.length > 0 && !flags.includes('PERFECT_MATCH');

  return (
    <div style={styles.agreementContainer}>
      <div style={styles.agreementHeader}>
        <span style={styles.agreementTitle}>Model vs History</span>
        <span style={{ ...styles.agreementLevel, color: agreement.color }}>{agreement.label}</span>
      </div>
      
      <div style={styles.agreementGrid}>
        <div style={styles.agreementMetric} title="Lower divergence = better agreement">
          <div style={styles.metricLabel}>Diverge</div>
          <div style={{ ...styles.metricValue, color: rmse > 20 ? '#ef4444' : '#374151' }}>
            {rmse?.toFixed(1) || '—'}%
          </div>
        </div>
        <div style={styles.agreementMetric} title="Correlation (1.0 = perfect match)">
          <div style={styles.metricLabel}>Corr</div>
          <div style={{ ...styles.metricValue, color: corr < 0.3 ? '#ef4444' : corr >= 0.5 ? '#22c55e' : '#374151' }}>
            {corr?.toFixed(2) || '—'}
          </div>
        </div>
        <div style={styles.agreementMetric} title="Days where model and replay agree on direction">
          <div style={styles.metricLabel}>Direction</div>
          <div style={styles.metricValue}>
            {directionalMismatch != null ? `${(100 - directionalMismatch).toFixed(0)}%` : '—'}
          </div>
        </div>
        <div style={styles.agreementMetric} title="Difference between endpoints">
          <div style={styles.metricLabel}>End Diff</div>
          <div style={styles.metricValue}>
            {terminalDelta != null ? `${terminalDelta >= 0 ? '+' : ''}${terminalDelta.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {hasWarnings && flags?.length > 0 && (
        <div style={styles.warningsRow}>
          {flags.filter(f => f !== 'PERFECT_MATCH').map((flag, i) => (
            <span key={i} style={styles.warningBadge}>{formatWarningFlag(flag)}</span>
          ))}
        </div>
      )}
      
      <div style={styles.sampleInfo}>Based on {samplePoints || 30} data points</div>
    </div>
  );
}

function formatWarningFlag(flag) {
  const labels = {
    'HIGH_DIVERGENCE': 'High divergence',
    'LOW_CORR': 'Low correlation',
    'TERM_DRIFT': 'Terminal drift',
    'DIR_MISMATCH': 'Direction mismatch',
  };
  return labels[flag] || flag;
}

// Old DivergenceDetails removed - now using AgreementSection above

const styles = {
  // Main container - very compact
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: '10px 12px',
    marginTop: 6,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },
  horizonBadge: {
    fontSize: 9,
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: 3,
  },
  currentPrice: {
    fontSize: 10,
    color: '#6b7280',
  },
  qualityBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#0284c7',
    backgroundColor: '#f0f9ff',
    padding: '3px 8px',
    borderRadius: 4,
  },
  // Projection grid - inline
  projectionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 8,
  },
  projectionBlock: {
    backgroundColor: '#fafafa',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'help',
  },
  blockHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#374151',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  returnValue: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  targetPrice: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 2,
  },
  matchInfo: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 2,
  },
  noData: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Agreement section - inline
  agreementContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: '8px 10px',
  },
  agreementHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  agreementTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#374151',
  },
  agreementLevel: {
    fontSize: 10,
    fontWeight: 700,
  },
  agreementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
  },
  agreementMetric: {
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
  },
  warningsRow: {
    display: 'flex',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  warningBadge: {
    fontSize: 8,
    padding: '2px 6px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    borderRadius: 3,
    fontWeight: 500,
  },
  sampleInfo: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'right',
  },
};

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
