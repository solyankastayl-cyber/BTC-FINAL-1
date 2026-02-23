/**
 * STRATEGY CONTROL PANEL — Global Unified Controls
 * 
 * Single row for all strategy controls:
 * Mode: Conservative | Balanced | Aggressive
 * Horizon: 7D / 14D / 30D
 * Execution: Active / Shadow
 * 
 * This is the SINGLE source of truth for strategy settings
 */

import React from 'react';
import { Settings, Clock, Play, Eye } from 'lucide-react';

const MODES = [
  { key: 'conservative', label: 'Conservative' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'aggressive', label: 'Aggressive' },
];

const HORIZONS = [
  { key: 7, label: '7D' },
  { key: 14, label: '14D' },
  { key: 30, label: '30D' },
];

const EXECUTIONS = [
  { key: 'ACTIVE', label: 'Active', icon: Play, color: '#22c55e' },
  { key: 'SHADOW', label: 'Shadow', icon: Eye, color: '#6366f1' },
];

export function StrategyControlPanel({ 
  mode = 'balanced', 
  horizon = 7, 
  execution = 'ACTIVE',
  onModeChange,
  onHorizonChange,
  onExecutionChange,
  loading = false 
}) {
  return (
    <div className="strategy-control-panel" data-testid="strategy-control-panel" style={styles.container}>
      {/* Title */}
      <div style={styles.titleSection}>
        <Settings style={styles.icon} size={16} />
        <span style={styles.title}>Strategy Controls</span>
      </div>

      {/* Controls Row */}
      <div style={styles.controlsRow}>
        {/* Mode Selector */}
        <div style={styles.controlGroup}>
          <span style={styles.label}>Mode</span>
          <div style={styles.buttonGroup}>
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => onModeChange?.(m.key)}
                disabled={loading}
                data-testid={`mode-${m.key}`}
                style={{
                  ...styles.button,
                  ...(mode === m.key ? styles.buttonActive : {}),
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Horizon Selector */}
        <div style={styles.controlGroup}>
          <span style={styles.label}>
            <Clock size={12} style={{ marginRight: 4 }} />
            Horizon
          </span>
          <div style={styles.buttonGroup}>
            {HORIZONS.map(h => (
              <button
                key={h.key}
                onClick={() => onHorizonChange?.(h.key)}
                disabled={loading}
                data-testid={`horizon-${h.key}`}
                style={{
                  ...styles.horizonButton,
                  ...(horizon === h.key ? styles.horizonButtonActive : {}),
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Execution Selector */}
        <div style={styles.controlGroup}>
          <span style={styles.label}>Execution</span>
          <div style={styles.buttonGroup}>
            {EXECUTIONS.map(e => {
              const Icon = e.icon;
              const isActive = execution === e.key;
              return (
                <button
                  key={e.key}
                  onClick={() => onExecutionChange?.(e.key)}
                  disabled={loading}
                  data-testid={`execution-${e.key}`}
                  style={{
                    ...styles.executionButton,
                    backgroundColor: isActive ? e.color : '#f3f4f6',
                    color: isActive ? '#fff' : '#6b7280',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <Icon size={12} style={{ marginRight: 4 }} />
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  icon: {
    color: '#6b7280',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f3f4f6',
    padding: '3px',
    borderRadius: '8px',
  },
  button: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buttonActive: {
    backgroundColor: '#111827',
    color: '#fff',
  },
  horizonButton: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  horizonButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  executionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
  },
  divider: {
    width: '1px',
    height: '28px',
    backgroundColor: '#e5e7eb',
  },
};

export default StrategyControlPanel;
