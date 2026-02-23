import React, { useEffect, useMemo, useState } from "react";
import { FractalChartCanvas } from "./FractalChartCanvas";
import { ForecastSummary7d } from "./ForecastSummary7d";

/**
 * BLOCK 72 — Focus-Aware Main Chart with Horizon-Specific Rendering
 * 
 * UPDATED: 
 * - 7D: Shows probability capsule (not trajectory line)
 * - 14D/30D: Shows aftermath-driven trajectory with fan
 * - 180D/365D: Normalized % axis for readability
 * 
 * Props:
 * - focus: Current horizon ('7d'|'14d'|'30d'|'90d'|'180d'|'365d')
 * - focusPack: Data from useFocusPack hook
 */

export function FractalMainChart({ 
  symbol = "BTC", 
  width = 1100, 
  height = 420,
  focus = '30d',
  focusPack = null
}) {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch chart data (candles, sma200, phases) - this doesn't depend on focus
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

  // Build forecast from focusPack - this changes with focus
  const forecast = useMemo(() => {
    const candles = chart?.candles;
    if (!candles?.length) return null;
    if (!focusPack?.forecast) return null;

    const currentPrice = candles[candles.length - 1].c;
    const fp = focusPack.forecast;
    const meta = focusPack.meta;
    const overlay = focusPack.overlay;
    
    // Get aftermath days from meta
    const aftermathDays = meta?.aftermathDays || 30;
    
    // Build markers from focusPack forecast
    const markers = fp.markers || [];
    
    // Get distribution series for 7D capsule mode
    const distributionSeries = overlay?.distributionSeries || {};
    
    // Get last day quantiles for 7D display
    const lastIdx = (distributionSeries.p50?.length || 1) - 1;
    const distribution7d = {
      p10: distributionSeries.p10?.[lastIdx] ?? -0.15,
      p25: distributionSeries.p25?.[lastIdx] ?? -0.05,
      p50: distributionSeries.p50?.[lastIdx] ?? 0,
      p75: distributionSeries.p75?.[lastIdx] ?? 0.05,
      p90: distributionSeries.p90?.[lastIdx] ?? 0.15,
    };
    
    // Convert distribution-based forecast to chart format
    // pricePath = central path (p50)
    // upperBand/lowerBand = confidence bands
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
      // Distribution for 7D capsule mode
      distribution7d,
      // Include distribution stats for display
      stats: overlay?.stats || {}
    };
  }, [chart, focusPack]);
  
  // Current price for summary panel
  const currentPrice = chart?.candles?.[chart.candles.length - 1]?.c || 0;

  if (loading) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 12 }}>
        <div style={{ color: "rgba(0,0,0,0.5)", fontSize: 14 }}>Loading chart...</div>
      </div>
    );
  }

  return (
    <div style={{ width, background: "#fff", borderRadius: 12, overflow: "hidden" }}>
      <FractalChartCanvas 
        chart={chart} 
        forecast={forecast} 
        focus={focus}
        normalizedSeries={focusPack?.normalizedSeries}
        width={width} 
        height={height} 
      />
      {/* Show 7D Summary Panel only for 7D focus */}
      {focus === '7d' && focusPack && (
        <ForecastSummary7d focusPack={focusPack} currentPrice={currentPrice} />
      )}
    </div>
  );
}
