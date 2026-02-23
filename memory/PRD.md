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

### Fixed: HTTP 520 Error
- Installed npm dependencies in `/app/backend`
- TypeScript Fractal backend now starts properly

## Technical Notes
- boxShadow only on Tooltip components (for popup hints)
- border-t, border-b (top/bottom separators) preserved for visual structure
- `normal-case` class used to prevent uppercase transformation from global styles

## Key Files Modified
- `/app/frontend/src/components/fractal/chart/FractalHybridChart.jsx` - Main hybrid panel components

## Next Action Items
- [ ] User testing and feedback
- [ ] Check other admin panel tabs for remaining border/shadow issues

## Backlog (P2)
- Performance optimization
- Mobile UX improvements
- Typography system standardization across the app
