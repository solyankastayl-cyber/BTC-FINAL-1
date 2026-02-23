/**
 * STRATEGY SUMMARY — Compact 2-Column Layout
 * 
 * Replaces 3 separate cards (Decision, Position & Risk, Edge Diagnostics)
 * with one unified compact panel.
 * 
 * Uses GLOBAL mode/horizon/execution from StrategyControlPanel
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Shield, Target, Activity, Gauge, AlertTriangle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export function StrategySummary({ 
  symbol = 'BTC', 
  mode = 'balanced',
  horizon = 7,
  execution = 'ACTIVE'
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const fetchStrategy = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/fractal/v2.1/strategy?symbol=${symbol}&preset=${mode}`);
        if (cancelled) return;
        if (!res.ok) {
          setData(null);
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setData(json);
      } catch (err) {
        if (!cancelled) console.error('[StrategySummary] Fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    fetchStrategy();
    return () => { cancelled = true; };
  }, [symbol, mode]);

  if (loading && !data) {
    return (
      <div style={styles.container} data-testid="strategy-summary">
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container} data-testid="strategy-summary">
        <div style={styles.error}>Failed to load strategy data</div>
      </div>
    );
  }

  const { decision, edge, diagnostics, regime } = data;

  return (
    <div style={styles.container} data-testid="strategy-summary">
      {/* Header row */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <span style={styles.sectionTitle}>Strategy Summary</span>
          <span style={styles.modeTag}>{mode.charAt(0).toUpperCase() + mode.slice(1)} · {horizon}D · {execution}</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={styles.twoColumns}>
        {/* Left Column - Decision & Position */}
        <div style={styles.column}>
          {/* Decision */}
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>
              <Activity size={14} style={{ marginRight: 6, color: '#6b7280' }} />
              Mode
            </span>
            <span style={{
              ...styles.modeBadge,
              color: getModeColor(decision.mode),
            }}>
              {formatMode(decision.mode)}
            </span>
          </div>

          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Regime</span>
            <span style={styles.metricValue}>{regime}</span>
          </div>

          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>
              <Gauge size={14} style={{ marginRight: 6, color: '#6b7280' }} />
              Edge Score
            </span>
            <span style={{
              ...styles.metricValue,
              color: getEdgeColor(edge.grade),
              fontWeight: '700',
            }}>
              {edge.score} / 100
            </span>
          </div>

          <div style={styles.separator} />

          {/* Position & Risk */}
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Position Size</span>
            <span style={styles.metricValue}>{(decision.positionSize * 100).toFixed(1)}%</span>
          </div>

          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Expected Return</span>
            <span style={{
              ...styles.metricValue,
              color: decision.expectedReturn >= 0 ? '#16a34a' : '#dc2626',
            }}>
              {decision.expectedReturn >= 0 ? '+' : ''}{(decision.expectedReturn * 100).toFixed(1)}%
            </span>
          </div>

          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>Risk/Reward</span>
            <span style={{
              ...styles.metricValue,
              color: getRRColor(decision.riskReward),
            }}>
              {decision.riskReward.toFixed(2)}
            </span>
          </div>

          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>
              <AlertTriangle size={14} style={{ marginRight: 6, color: '#dc2626' }} />
              Worst Case
            </span>
            <span style={{ ...styles.metricValue, color: '#dc2626' }}>
              {(decision.tailRisk * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Right Column - Diagnostics */}
        <div style={styles.column}>
          <DiagnosticItem 
            label="Confidence"
            value={diagnostics.confidence.value}
            status={diagnostics.confidence.status}
          />
          <DiagnosticItem 
            label="Reliability"
            value={diagnostics.reliability.value}
            status={diagnostics.reliability.status}
          />
          <DiagnosticItem 
            label="Entropy"
            value={diagnostics.entropy.value}
            status={diagnostics.entropy.status}
            inverted
          />
          <DiagnosticItem 
            label="Stability"
            value={diagnostics.stability.value}
            status={diagnostics.stability.status}
          />

          <div style={styles.separator} />

          {/* Statistical Edge */}
          <div style={styles.metricRow}>
            <span style={styles.metricLabel}>
              <Shield size={14} style={{ marginRight: 6, color: '#6b7280' }} />
              Statistical Edge
            </span>
            <span style={{
              ...styles.edgeBadge,
              backgroundColor: edge.hasStatisticalEdge ? '#dcfce7' : '#fee2e2',
              color: edge.hasStatisticalEdge ? '#166534' : '#991b1b',
            }}>
              {edge.hasStatisticalEdge ? 'Valid' : 'Weak'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagnosticItem({ label, value, status, inverted = false }) {
  const pct = (value * 100).toFixed(1);
  const color = getStatusColor(status);
  
  return (
    <div style={styles.metricRow}>
      <span style={styles.metricLabel}>{label}</span>
      <div style={styles.diagnosticValue}>
        <span style={styles.metricValue}>{pct}%</span>
        <span style={{
          ...styles.statusDot,
          backgroundColor: color,
        }} />
      </div>
    </div>
  );
}

function formatMode(mode) {
  const modes = {
    'FULL': 'Full Position',
    'PARTIAL': 'Partial',
    'MICRO': 'Micro',
    'NO_TRADE': 'No Trade',
  };
  return modes[mode] || mode;
}

function getModeColor(mode) {
  switch (mode) {
    case 'FULL': return '#16a34a';
    case 'PARTIAL': return '#d97706';
    case 'MICRO': return '#3b82f6';
    case 'NO_TRADE': return '#6b7280';
    default: return '#6b7280';
  }
}

function getEdgeColor(grade) {
  switch (grade) {
    case 'INSTITUTIONAL': return '#16a34a';
    case 'STRONG': return '#22c55e';
    case 'NEUTRAL': return '#d97706';
    case 'WEAK': return '#dc2626';
    default: return '#6b7280';
  }
}

function getRRColor(rr) {
  if (rr >= 2) return '#16a34a';
  if (rr >= 1) return '#d97706';
  return '#dc2626';
}

function getStatusColor(status) {
  switch (status) {
    case 'ok': return '#16a34a';
    case 'warn': return '#d97706';
    case 'block': return '#dc2626';
    default: return '#6b7280';
  }
}

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  modeTag: {
    display: 'none', // Hidden - remove badge
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#111827',
  },
  diagnosticValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  modeBadge: {
    padding: '0',
    borderRadius: '0',
    backgroundColor: 'transparent',
    fontSize: '11px',
    fontWeight: '600',
  },
  edgeBadge: {
    padding: '0',
    borderRadius: '0',
    backgroundColor: 'transparent',
    fontSize: '11px',
    fontWeight: '600',
  },
  separator: {
    height: '1px',
    backgroundColor: '#f3f4f6',
    margin: '6px 0',
  },
  loading: {
    padding: '30px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '13px',
  },
  error: {
    padding: '30px',
    textAlign: 'center',
    color: '#dc2626',
    fontSize: '13px',
  },
};

export default StrategySummary;
