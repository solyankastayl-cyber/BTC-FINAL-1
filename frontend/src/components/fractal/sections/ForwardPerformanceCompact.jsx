/**
 * FORWARD PERFORMANCE COMPACT — Simplified Layout
 * 
 * Uses GLOBAL settings from StrategyControlPanel (no local selectors)
 * Shows:
 * - Header with current settings
 * - Chart (when data available)
 * - Metrics in ONE row (not 8 cards)
 */

import React, { useEffect, useState, useRef } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export function ForwardPerformanceCompact({ 
  symbol = 'BTC',
  mode = 'balanced',
  horizon = 7,
  execution = 'ACTIVE'
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const preset = mode.toUpperCase();
        const role = execution;
        const url = `${API_URL}/api/fractal/v2.1/admin/forward-equity?symbol=${symbol}&preset=${preset}&horizon=${horizon}&role=${role}`;
        
        const res = await fetch(url, { signal: controller.signal });
        
        if (cancelled) return;
        
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          setData(null);
          return;
        }
        
        const json = await res.json();
        
        if (cancelled) return;
        
        if (json.error) {
          setError(json.message || json.error);
          setData(null);
        } else {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [symbol, mode, horizon, execution]);

  // Draw equity chart - full width
  useEffect(() => {
    if (!canvasRef.current || !data?.equity?.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 900;
    const height = 200;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `100%`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const equity = data.equity;
    const values = equity.map(p => p.value);
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const range = maxVal - minVal || 1;

    const padding = { top: 15, right: 15, bottom: 25, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const scaleX = (i) => padding.left + (i / (equity.length - 1 || 1)) * chartW;
    const scaleY = (v) => padding.top + chartH - ((v - minVal) / range) * chartH;

    // Draw baseline at 1.0
    ctx.beginPath();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const y1 = scaleY(1.0);
    ctx.moveTo(padding.left, y1);
    ctx.lineTo(width - padding.right, y1);
    ctx.stroke();

    // Draw equity line
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    
    equity.forEach((p, i) => {
      const x = scaleX(i);
      const y = scaleY(p.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area
    ctx.lineTo(scaleX(equity.length - 1), scaleY(1.0));
    ctx.lineTo(scaleX(0), scaleY(1.0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fill();

    // Y-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
      const v = minVal + (range * i / 4);
      const y = scaleY(v);
      ctx.fillText(v.toFixed(3), padding.left - 6, y + 3);
    }

  }, [data]);

  const metrics = data?.metrics;

  return (
    <div style={styles.container} data-testid="forward-performance-compact">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <BarChart3 size={16} style={{ color: '#6b7280' }} />
          <span style={styles.title}>Forward Performance</span>
          <span style={styles.badge}>
            {horizon}D · {mode.charAt(0).toUpperCase() + mode.slice(1)} · {execution}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>Error: {error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>Loading...</div>
      )}

      {/* Content - Chart + metrics below */}
      {data && !loading && (
        <>
          {data.equity && data.equity.length > 0 ? (
            <div style={styles.chartWrapper}>
              <canvas ref={canvasRef} style={styles.canvas} />
            </div>
          ) : (
            <div style={styles.emptyState}>
              <Activity size={28} style={{ color: '#d1d5db', marginBottom: 6 }} />
              <span style={styles.emptyText}>No resolved trades yet for {horizon}d horizon</span>
            </div>
          )}
          
          {/* Metrics row below chart */}
          <div style={styles.metricsRow}>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>CAGR</span>
              <span style={{ ...styles.metricValue, color: metrics?.cagr > 0 ? '#22c55e' : '#ef4444' }}>
                {metrics?.cagrFormatted || '0.00%'}
              </span>
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Win Rate</span>
              <span style={{ ...styles.metricValue, color: metrics?.winRate >= 50 ? '#22c55e' : '#f59e0b' }}>
                {metrics?.winRateFormatted || '0.0%'}
              </span>
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Max DD</span>
              <span style={{ ...styles.metricValue, color: '#374151' }}>
                {metrics?.maxDDFormatted || '0.00%'}
              </span>
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Sharpe</span>
              <span style={{ ...styles.metricValue, color: metrics?.sharpe > 1 ? '#22c55e' : '#374151' }}>
                {metrics?.sharpe?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div style={styles.metricBox}>
              <span style={styles.metricLabel}>Trades</span>
              <span style={{ ...styles.metricValue, color: '#374151' }}>
                {metrics?.trades || 0}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '12px',
  },
  loading: {
    padding: '30px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '13px',
  },
  chartWrapper: {
    marginBottom: '12px',
  },
  canvas: {
    display: 'block',
    width: '100%',
    border: '1px solid #f3f4f6',
    borderRadius: '6px',
  },
  metricsRow: {
    display: 'flex',
    gap: '8px',
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metricLabel: {
    fontSize: '10px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: '15px',
    fontWeight: '600',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#6b7280',
  },
};

export default ForwardPerformanceCompact;
