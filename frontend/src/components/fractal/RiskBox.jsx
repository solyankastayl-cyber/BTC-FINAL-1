/**
 * U7 — Risk Box 2.0
 * 
 * Shows risk assessment and position sizing with human-readable explanations:
 * - RiskHeader: Risk level, Vol Regime, Drift status
 * - DrawdownStats: avgMaxDD, tailRiskP95
 * - PositionSizing: Final size with bullet reasons
 * - Blockers: Trading disabled warnings
 */

import React, { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  AlertOctagon,
  TrendingDown, 
  Scale,
  ChevronDown,
  ChevronUp,
  Ban,
  Activity,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// RISK HEADER
// ═══════════════════════════════════════════════════════════════

function RiskHeader({ riskLevel, volRegime, driftStatus }) {
  const riskConfigs = {
    NORMAL: { 
      icon: Shield, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50/50', 
      label: 'NORMAL',
      description: 'Standard market conditions'
    },
    ELEVATED: { 
      icon: AlertTriangle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50/50', 
      label: 'ELEVATED',
      description: 'Increased caution advised'
    },
    CRISIS: { 
      icon: AlertOctagon, 
      color: 'text-red-600', 
      bg: 'bg-red-50/50', 
      label: 'CRISIS',
      description: 'High risk environment'
    },
  };
  
  const volConfigs = {
    LOW: { color: 'text-emerald-600' },
    MEDIUM: { color: 'text-blue-600' },
    HIGH: { color: 'text-amber-600' },
    CRISIS: { color: 'text-red-600' },
    CONTRACTION: { color: 'text-emerald-600' },
    EXPANSION: { color: 'text-amber-600' },
  };
  
  const riskConfig = riskConfigs[riskLevel] || riskConfigs.NORMAL;
  const volConfig = volConfigs[volRegime] || volConfigs.MEDIUM;
  const RiskIcon = riskConfig.icon;
  
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg ${riskConfig.bg}`}>
      <div className="flex items-center gap-3">
        <RiskIcon className={`w-8 h-8 ${riskConfig.color}`} />
        <div>
          <div className={`text-lg font-bold ${riskConfig.color}`}>
            Risk: {riskConfig.label}
          </div>
          <div className="text-xs text-slate-500">{riskConfig.description}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Vol Regime */}
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase">Vol Regime</div>
          <div className={`text-sm font-bold ${volConfig.color}`}>{volRegime || 'MEDIUM'}</div>
        </div>
        
        {/* Drift Status (if present) */}
        {driftStatus && driftStatus !== 'OK' && (
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">Drift</div>
            <div className="text-sm font-bold text-amber-600">{driftStatus}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DRAWDOWN STATS
// ═══════════════════════════════════════════════════════════════

function DrawdownStats({ avgMaxDD, tailRiskP95 }) {
  const formatPct = (v) => {
    if (v === undefined || v === null) return '—';
    return `${(v * 100).toFixed(1)}%`;
  };
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {/* Average Drawdown */}
      <div 
        className="p-3 bg-slate-50 rounded-lg"
        title="Average maximum drawdown observed within the forecast horizon across all historical matches"
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-500">Avg Drawdown</span>
        </div>
        <div className="text-xl font-bold text-amber-600">{formatPct(avgMaxDD)}</div>
        <div className="text-[10px] text-slate-400 mt-1">
          Average worst-case within horizon
        </div>
      </div>
      
      {/* Worst-case Scenario */}
      <div 
        className="p-3 bg-slate-50 rounded-lg"
        title="5th percentile of returns — the level exceeded only 5% of the time (worst outcomes)"
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-slate-500">Worst-case (5%)</span>
        </div>
        <div className="text-xl font-bold text-red-600">{formatPct(tailRiskP95)}</div>
        <div className="text-[10px] text-slate-400 mt-1">
          5% worst historical outcomes
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// POSITION SIZING
// ═══════════════════════════════════════════════════════════════

function PositionSizing({ sizing, showAdvanced, onToggleAdvanced }) {
  if (!sizing) return null;
  
  const { 
    finalSize = 0, 
    finalPercent = 0,
    sizeLabel = 'NONE', 
    breakdown = [],
    explain = [],
    blockers = [],
    formula,
    mode
  } = sizing;
  
  // Determine color based on size
  let sizeColor = 'text-emerald-600';
  let sizeBg = 'bg-emerald-50';
  
  if (finalSize <= 0) {
    sizeColor = 'text-red-600';
    sizeBg = 'bg-red-50';
  } else if (finalSize < 0.25) {
    sizeColor = 'text-amber-600';
    sizeBg = 'bg-amber-50';
  } else if (finalSize < 0.5) {
    sizeColor = 'text-blue-600';
    sizeBg = 'bg-blue-50';
  }
  
  // Extract top reasons from breakdown
  const topReasons = breakdown
    .filter(b => b.severity === 'CRITICAL' || b.multiplier < 0.5)
    .slice(0, 3)
    .map(b => b.note);
  
  // If no critical reasons, use explain
  const displayReasons = topReasons.length > 0 ? topReasons : explain.slice(0, 3);
  
  return (
    <div className="mt-4">
      {/* Main Size Display */}
      <div className={`p-4 rounded-xl ${sizeBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className={`w-6 h-6 ${sizeColor}`} />
            <div>
              <div className="text-xs text-slate-500 uppercase">Recommended Position</div>
              <div className={`text-2xl font-bold ${sizeColor}`}>
                {finalSize > 0 ? `${(finalSize * 100).toFixed(0)}%` : 'NO TRADE'}
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({sizeLabel})
                </span>
              </div>
            </div>
          </div>
          
          {/* Size Badge */}
          <div className={`px-4 py-2 rounded-lg ${sizeBg}`}>
            <span className={`text-lg font-mono font-bold ${sizeColor}`}>
              {finalSize.toFixed(2)}x
            </span>
          </div>
        </div>
        
        {/* Reasons */}
        {displayReasons.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 uppercase mb-2">Reasons:</div>
            <ul className="space-y-1">
              {displayReasons.map((reason, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BLOCKERS
// ═══════════════════════════════════════════════════════════════

function Blockers({ blockers, constitution, driftStatus }) {
  // Combine all blockers
  const allBlockers = [...(blockers || [])];
  
  if (constitution?.status === 'BLOCK') {
    allBlockers.push('CONSTITUTION_BLOCK');
  }
  
  if (driftStatus === 'CRITICAL') {
    allBlockers.push('DRIFT_CRITICAL');
  }
  
  if (allBlockers.length === 0) return null;
  
  // Blocker explanations
  const blockerExplain = {
    'LOW_CONFIDENCE': 'Model confidence too low',
    'HIGH_ENTROPY': 'High prediction uncertainty',
    'VOL_CRISIS': 'Volatility in crisis mode',
    'EXTREME_VOL_SPIKE': 'Extreme volatility spike detected',
    'CONSTITUTION_BLOCK': 'Risk guardrails activated',
    'DRIFT_CRITICAL': 'Model drift critical',
    'NO_SIGNAL': 'No clear trading signal',
    'CONFLICT_HIGH': 'High horizon conflict',
  };
  
  return (
    <div className="mt-4 p-4 bg-red-50 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Ban className="w-5 h-5 text-red-600" />
        <span className="text-sm font-bold text-red-700 uppercase">Trading Disabled</span>
      </div>
      
      <div className="space-y-2">
        {allBlockers.map((blocker, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-red-600">
            <XCircle className="w-4 h-4" />
            <span>{blockerExplain[blocker] || blocker}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-red-200 text-xs text-red-500">
        Position sizing reduced to 0% until conditions improve
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN RISK BOX
// ═══════════════════════════════════════════════════════════════

export function RiskBox({ 
  scenario, 
  volatility, 
  sizing, 
  constitution,
  driftStatus 
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Derive risk level from volatility and scenario
  let riskLevel = 'NORMAL';
  const volRegime = volatility?.regime;
  const avgMaxDD = scenario?.avgMaxDD;
  
  if (volRegime === 'CRISIS' || avgMaxDD < -0.25) {
    riskLevel = 'CRISIS';
  } else if (volRegime === 'HIGH' || volRegime === 'EXPANSION' || avgMaxDD < -0.15) {
    riskLevel = 'ELEVATED';
  }
  
  // Check for active blockers
  const hasBlockers = sizing?.blockers?.length > 0 || sizing?.mode === 'NO_TRADE';
  
  return (
    <div 
      className="bg-white rounded-xl p-5"
      data-testid="risk-box"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Risk & Position
        </h3>
        {sizing?.mode && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            sizing.mode === 'NO_TRADE' ? 'bg-red-100 text-red-700' :
            sizing.mode === 'CONSERVATIVE' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            {sizing.mode}
          </span>
        )}
      </div>
      
      {/* Risk Header */}
      <RiskHeader 
        riskLevel={riskLevel}
        volRegime={volRegime}
        driftStatus={driftStatus}
      />
      
      {/* Drawdown Stats */}
      <DrawdownStats 
        avgMaxDD={scenario?.avgMaxDD}
        tailRiskP95={scenario?.tailRiskP95}
      />
      
      {/* Position Sizing */}
      <PositionSizing 
        sizing={sizing}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />
      
      {/* Blockers Warning */}
      {hasBlockers && (
        <Blockers 
          blockers={sizing?.blockers}
          constitution={constitution}
          driftStatus={driftStatus}
        />
      )}
    </div>
  );
}

export default RiskBox;
