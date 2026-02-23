# Fractal Module - PRD

## Original Problem Statement
Клонировать репозиторий, поднять фронт, бэкенд и админку. Работа только с областью Fractal. Убрать тени и обводки с карточек.

## Architecture
- **Frontend**: React + Tailwind CSS (craco config)
- **Backend**: FastAPI (Python) + TypeScript Fractal Backend (Fastify)
- **Database**: MongoDB
- **Repository**: https://github.com/solyankastayl-cyber/45455

## What's Been Implemented (2026-02-23)

### Session 1: Initial border/shadow cleanup
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

### Fixed: HTTP 520 Error
- Installed npm dependencies in `/app/backend`
- TypeScript Fractal backend now starts properly

## Technical Notes
- boxShadow оставлен только на Tooltip компонентах (для popup подсказок)
- border-t, border-b (top/bottom separators) сохранены для визуальной структуры

## Next Action Items
- [ ] Проверить другие вкладки админки на предмет обводок

## Backlog (P2)
- Оптимизация производительности фронтенда
- Улучшение UX на мобильных устройствах
