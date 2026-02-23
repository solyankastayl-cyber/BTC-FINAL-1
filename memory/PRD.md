# Fractal Module PRD — Strategy Controls Unification

## Original Problem Statement
Переработка UI модуля Fractal для устранения дублирования и улучшения UX:
- Вкладка слишком высокая, много пустоты
- Дублируются переключатели режимов (Conservative/Balanced/Aggressive)
- Режимы влияли локально, а должны глобально
- График Forward Performance не работал (нет resolved trades)
- Технический мусор и 3 больших карточки вместо компактной панели

## Architecture & Solution

### Global Strategy Controls Model
```
Strategy Control Panel (GLOBAL)
↓
Strategy Summary (receives global state)
↓
Forward Performance (receives global state)
```

### Key Changes Implemented (2026-02-23)

1. **StrategyControlPanel.jsx** - Единая глобальная панель
   - Mode: Conservative | Balanced | Aggressive
   - Horizon: 7D | 14D | 30D
   - Execution: Active | Shadow
   - Single row layout

2. **StrategySummary.jsx** - Компактный 2-колоночный layout
   - Заменяет 3 отдельных карточки (Decision, Position & Risk, Edge Diagnostics)
   - Left column: Mode, Regime, Edge Score, Position Size, Expected Return, Risk/Reward, Worst Case
   - Right column: Confidence, Reliability, Entropy, Stability, Statistical Edge
   - Shows current global settings in header badge

3. **ForwardPerformanceCompact.jsx** - Упрощённый Forward Performance
   - NO local selectors (removed duplicate Preset/Horizon/Role controls)
   - Uses global settings from StrategyControlPanel
   - Metrics in single row: CAGR | WIN RATE | MAX DD | SHARPE | TRADES
   - Chart area preserved for when resolved trades exist

4. **FractalPage.js** - Updated to use global state
   - Added: strategyMode, strategyHorizon, strategyExecution state
   - All strategy components receive global state as props
   - Mode changes propagate to all components simultaneously

## User Personas
- **Institutional Trader**: Needs unified view without redundant controls
- **Analyst**: Requires compact data display for quick decisions
- **Developer**: Needs clean component architecture

## Core Requirements (Static)
- ✅ Single global mode selector
- ✅ Compact strategy summary
- ✅ No duplicate selectors in Forward Performance
- ✅ Metrics in single row format
- ✅ Responsive layout

## What's Implemented
| Date | Feature | Status |
|------|---------|--------|
| 2026-02-23 | StrategyControlPanel global controls | ✅ Done |
| 2026-02-23 | StrategySummary 2-column layout | ✅ Done |
| 2026-02-23 | ForwardPerformanceCompact | ✅ Done |
| 2026-02-23 | FractalPage.js global state integration | ✅ Done |
| 2026-02-23 | Backend TypeScript setup (proxy) | ✅ Done |
| 2026-02-23 | Test Snapshot Generator API | ✅ Done |
| 2026-02-23 | Forward Performance chart with real data | ✅ Done |
| 2026-02-23 | Mode presets affect backend calculations | ✅ Done |

## Prioritized Backlog

### P0 (Critical) — Done
- [x] Global strategy controls
- [x] Remove duplicate selectors
- [x] Compact strategy summary

### P1 (Important) — Future
- [ ] Fix graph when resolved trades exist
- [ ] Add snapshot generation for testing
- [ ] Strategy mode affects calculations on backend

### P2 (Nice to have)
- [ ] Animation on mode switch
- [ ] Keyboard shortcuts for mode switching
- [ ] Save user preferences

## Tech Stack
- Frontend: React 19.x + Tailwind CSS
- Backend: TypeScript (Express) + Python proxy (FastAPI)
- Database: MongoDB

## API Endpoints Used
- `GET /api/fractal/v2.1/strategy?symbol=BTC&preset={mode}`
- `GET /api/fractal/v2.1/admin/forward-equity?symbol=BTC&preset={mode}&horizon={h}&role={execution}`

## Next Tasks
1. Test mode switching with real data differences
2. Add snapshot generation for Forward Performance chart testing
3. Consider adding keyboard shortcuts (C/B/A for modes)
