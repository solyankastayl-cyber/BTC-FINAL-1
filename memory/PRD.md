# Fractal Module - PRD

## Original Problem Statement
Клонировать репозиторий, поднять фронт, бэкенд и админку. Работа только с областью Fractal. Убрать тени и обводки с карточек. Сделать интерфейс удобным для инвестора (не для разработчика/quant).

## Architecture
- **Frontend**: React + Tailwind CSS (craco config)
- **Backend**: FastAPI (Python) + TypeScript Fractal Backend (Fastify)
- **Database**: MongoDB
- **Repository**: https://github.com/solyankastayl-cyber/45455

## What's Been Implemented

### Session 1: Initial border/shadow cleanup (2026-02-23)
Removed borders and shadows from main container components:
- `GlobalStructureBar.jsx`, `ConsensusPulseStrip.jsx`, `HorizonStackView.jsx`
- `HorizonMatrix.jsx`, `HorizonSelector.jsx`, `SizingBreakdown.jsx`
- `VolatilityCard.jsx`, `ForwardPerformancePanel.js`, `ShadowDivergenceDashboard.js`

### Session 2: Badge and card border cleanup
Removed borders from badges and inner cards:
- `GlobalStructureBar.jsx` - CONFLICT badge, final decision container, size badge, bias badge
- `ConsensusPulseStrip.jsx` - divergence badge
- `HorizonStackView.jsx` - horizon badge
- `PhaseHeatmap.jsx` - filter buttons, error state, main container, grade legend
- `OverlayMatchPicker.jsx` - picker buttons
- `HorizonSelector.jsx` - horizon buttons
- `SignalHeader.jsx` - SignalCard, ConfidenceCard, MarketModeCard, RiskCard, advanced metrics
- `RiskBox.jsx` - main container, sizing container, blocker alerts
- `ScenarioBox.jsx` - outcome stats, empty state, main container

### Session 3: Hybrid Panel Redesign for Investors (2026-02-23) ✅
Complete redesign of `FractalHybridChart.jsx` components:

**HybridSummaryPanel:**
- Compact layout without borders
- Human-readable metrics with tooltips:
  - `Hybrid Projection (30D)` with `Quality: XX / 100`
  - `Model: +X.X% → $XXK`
  - `Replay: +X.X% → $XXK`
  - `Pattern Similarity: XX%`
  - `Directional Alignment: XX%`
  - `Projection Gap: +X%`
  - Late-stage divergence warning (when applicable)
- Tooltips explaining each metric in simple terms

**MatchPicker:**
- Removed numbering (#1, #2, etc.)
- Removed all borders/outlines
- Clean format: `2012-07-07 · 65% · Distribution`
- Selected match highlighted with bold text
- Tooltip explaining how to use

**PhaseFilterBar:**
- Simplified, clean indicator
- Removed colored badges

### Session 4: Cosmetic Cleanup (2026-02-23) ✅

**Chart Labels:**
- Removed "Conf: 100.0%" from forecast labels
- Only showing "Forecast: +X.X%" now

**Replay Tab - OverlayMatchPicker:**
- Removed hash signs (#), now just numbers: `1 · Accumulation · 85%`
- Full phase names instead of abbreviations (Accumulation, not Acc)
- Removed button backgrounds and borders - clean text style

**Replay Tab - Top Matches Card:**
- Removed hash signs (#): `1 Accumulation 85%`
- Full phase names displayed
- Removed colored badges with backgrounds
- Phase shown as colored text only

**Replay Tab - Match Metrics Card:**
- Removed border around card container
- Phase displayed as plain colored text (no badge background)

**Replay Tab - Vol Regime Card:**
- Removed border around card container

### Fixed: HTTP 520 Error
- Installed npm dependencies in `/app/backend`
- TypeScript Fractal backend now starts properly

## Technical Notes
- boxShadow only on Tooltip components (for popup hints)
- border-t, border-b (top/bottom separators) preserved for visual structure
- `normal-case` class used to prevent uppercase transformation from global styles

## Key Files Modified
- `/app/frontend/src/components/fractal/chart/FractalHybridChart.jsx` - Main hybrid panel components

### Session 5: Green Highlight for Best Fractal (2026-02-23) ✅
Added green highlighting for the best fractal (first in list with highest similarity):

**FractalHybridChart.jsx (MatchPicker):**
- Already had `isBest` logic with `text-emerald-600` ✅

**OverlayMatchPicker.jsx (Replay tab):**
- Added `isBest` check for index 0
- Color #059669 (emerald-600) applied to best match
- Tooltip: "Best match (highest similarity)"

**SpxMatchReplayPicker.jsx:**
- Added `isBest` prop to MatchChip component
- Best match has green background (`bg-emerald-50`), border (`border-emerald-300`), badge rank (`bg-emerald-200`)
- BEST badge instead of AUTO badge
- SpxMatchReplayChipsCompact also updated

### Session 6: UI Cleanup (2026-02-23) ✅
**Removed borders:**
- FractalAnalysisPanel.jsx — removed `border border-slate-200` from container

**Renamed "Avg DD" to investor-friendly terms:**
- FractalAnalysisPanel.jsx: "Max Pullback" (tooltip: "Average Max Drawdown — typical peak-to-trough decline")
- ScenarioBox.jsx: "Typical Pullback"
- RiskBox.jsx: "Typical Pullback"  
- FractalPage.js: "Typical Pullback"

## Next Action Items
- [ ] User testing and feedback

## Backlog (P2)
- Performance optimization
- Mobile UX improvements
- Typography system standardization across the app
