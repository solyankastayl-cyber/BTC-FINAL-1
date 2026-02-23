/**
 * FRACTAL ONLY - Isolated Development Entrypoint
 * 
 * Minimal bootstrap for Fractal + ML + MongoDB only.
 * No Exchange, On-chain, Sentiment, WebSocket, Telegram etc.
 * 
 * Run: npx tsx src/app.fractal.ts
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectMongo, disconnectMongo } from './db/mongoose.js';
import { registerFractalModule } from './modules/fractal/index.js';
import { registerBtcRoutes } from './modules/btc/index.js';
import { registerSpxRoutes } from './modules/spx/index.js';
import { registerSpxCoreRoutes } from './modules/spx-core/index.js';
import { registerCombinedRoutes } from './modules/combined/index.js';
import { adminAuthRoutes } from './core/admin/admin.auth.routes.js';
import { registerSpxMemoryRoutes } from './modules/spx-memory/spx-memory.routes.js';
import { registerSpxAttributionRoutes } from './modules/spx-attribution/spx-attribution.routes.js';
import { registerSpxDriftRoutes } from './modules/spx-drift/spx-drift.routes.js';
import { registerSpxConsensusRoutes } from './modules/spx-consensus/spx-consensus.routes.js';
import { registerSpxCalibrationRoutes } from './modules/spx-calibration/spx-calibration.routes.js';
import { registerSpxRulesRoutes } from './modules/spx-rules/spx-rules.routes.js';
import { registerSpxGuardrailsRoutes } from './modules/spx-guardrails/spx-guardrails.routes.js';
import { registerSpxCrisisRoutes, registerSpxCrisisDebugRoutes } from './modules/spx-crisis/spx-crisis.routes.js';
import { registerSpxRegimeRoutes } from './modules/spx-regime/regime.routes.js';
import { registerLifecycleRoutes } from './modules/lifecycle/lifecycle.routes.js';
import { registerDailyRunRoutes } from './modules/ops/daily-run/index.js';
import { registerSpxUnifiedRoutes } from './modules/fractal/api/fractal.spx.routes.js';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FRACTAL ONLY - Isolated Development Mode');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Get port from env or default
  const PORT = parseInt(process.env.PORT || '8001');
  
  // Connect to MongoDB
  console.log('[Fractal] Connecting to MongoDB...');
  await connectMongo();
  
  // Build minimal Fastify app
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });
  
  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  
  // Health endpoint
  app.get('/api/health', async () => ({
    ok: true,
    mode: 'FRACTAL_ONLY',
    timestamp: new Date().toISOString()
  }));
  
  // System health endpoint for SystemStatusBanner
  app.get('/api/system/health', async () => ({
    status: 'healthy',
    ts: new Date().toISOString(),
    services: {},
    metrics: { bootstrap: {} },
    notes: [],
  }));
  
  // Register ONLY Fractal module
  console.log('[Fractal] Registering Fractal Module...');
  await registerFractalModule(app);
  console.log('[Fractal] ✅ Fractal Module registered');
  
  // BLOCK A: Register BTC Terminal (Final Product)
  console.log('[Fractal] Registering BTC Terminal (Final)...');
  await registerBtcRoutes(app);
  console.log('[Fractal] ✅ BTC Terminal registered at /api/btc/v2.1/*');
  
  // BLOCK B: Register SPX Terminal (Building)
  console.log('[Fractal] Registering SPX Terminal (Building)...');
  await registerSpxRoutes(app);
  console.log('[Fractal] ✅ SPX Terminal registered at /api/spx/v2.1/*');
  
  // BLOCK B5: Register SPX Core (Fractal Engine)
  console.log('[Fractal] Registering SPX Core (Fractal Engine)...');
  await registerSpxCoreRoutes(app);
  console.log('[Fractal] ✅ SPX Core registered at /api/spx/v2.1/focus-pack');
  
  // BLOCK B6: Register SPX Memory Layer
  console.log('[Fractal] Registering SPX Memory Layer...');
  await registerSpxMemoryRoutes(app);
  console.log('[Fractal] ✅ SPX Memory registered at /api/spx/v2.1/admin/memory/*');
  
  // BLOCK B6.2: Register SPX Attribution
  console.log('[Fractal] Registering SPX Attribution...');
  await registerSpxAttributionRoutes(app);
  console.log('[Fractal] ✅ SPX Attribution registered at /api/spx/v2.1/admin/attribution/*');
  
  // BLOCK B6.3: Register SPX Drift Intelligence
  console.log('[Fractal] Registering SPX Drift Intelligence...');
  await registerSpxDriftRoutes(app);
  console.log('[Fractal] ✅ SPX Drift registered at /api/spx/v2.1/admin/drift/*');
  
  // BLOCK B5.5: Register SPX Consensus Engine
  console.log('[Fractal] Registering SPX Consensus Engine...');
  await registerSpxConsensusRoutes(app);
  console.log('[Fractal] ✅ SPX Consensus registered at /api/spx/v2.1/consensus');
  
  // BLOCK B6.4: Register SPX Calibration
  console.log('[Fractal] Registering SPX Calibration...');
  await registerSpxCalibrationRoutes(app);
  console.log('[Fractal] ✅ SPX Calibration registered at /api/spx/v2.1/admin/calibration/*');
  
  // BLOCK B6.6: Register SPX Rules Extraction
  console.log('[Fractal] Registering SPX Rules Extraction...');
  registerSpxRulesRoutes(app);
  console.log('[Fractal] ✅ SPX Rules registered at /api/spx/v2.1/admin/rules/*');
  
  // BLOCK B6.7: Register SPX Guardrails
  console.log('[Fractal] Registering SPX Guardrails...');
  await registerSpxGuardrailsRoutes(app);
  console.log('[Fractal] ✅ SPX Guardrails registered at /api/spx/v2.1/guardrails/*');
  
  // BLOCK B6.10: Register SPX Crisis Validation
  console.log('[Fractal] Registering SPX Crisis Validation...');
  await registerSpxCrisisRoutes(app);
  await registerSpxCrisisDebugRoutes(app);
  console.log('[Fractal] ✅ SPX Crisis B6.10 registered at /api/spx/v2.1/admin/crisis/*');
  
  // BLOCK B6.11: Register SPX Regime Decomposition Engine
  console.log('[Fractal] Registering SPX Regime Engine...');
  await registerSpxRegimeRoutes(app);
  console.log('[Fractal] ✅ SPX Regime B6.11 registered at /api/spx/v2.1/admin/regimes/*');
  
  // BLOCK L1: Register Unified Lifecycle Engine
  console.log('[Fractal] Registering Unified Lifecycle Engine...');
  await registerLifecycleRoutes(app);
  console.log('[Fractal] ✅ Lifecycle L1 registered at /api/lifecycle/*');
  
  // BLOCK L4.1: Register Daily Run Orchestrator
  console.log('[Fractal] Registering Daily Run Orchestrator...');
  await registerDailyRunRoutes(app);
  console.log('[Fractal] ✅ Daily Run L4.1 registered at /api/ops/daily-run/*');
  
  // BLOCK U1: Register SPX Unified Routes (BTC-compatible contract)
  console.log('[Fractal] Registering SPX Unified Routes (BTC-compatible)...');
  await registerSpxUnifiedRoutes(app);
  console.log('[Fractal] ✅ SPX Unified registered at /api/fractal/spx/*');
  
  // NOTE: SPX Phase routes already registered via spx-core module
  
  // BLOCK C: Register Combined Terminal (Building)
  console.log('[Fractal] Registering Combined Terminal (Building)...');
  await registerCombinedRoutes(app);
  console.log('[Fractal] ✅ Combined Terminal registered at /api/combined/v2.1/*');
  
  // Register Admin Auth routes
  console.log('[Fractal] Registering Admin Auth...');
  await app.register(adminAuthRoutes, { prefix: '/api/admin' });
  console.log('[Fractal] ✅ Admin Auth registered');
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Fractal] Received ${signal}, shutting down...`);
    await app.close();
    await disconnectMongo();
    console.log('[Fractal] Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Fractal Backend started on port ${PORT}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📦 Available Endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/fractal/health');
    console.log('  GET  /api/fractal/signal');
    console.log('  GET  /api/fractal/match');
    console.log('  POST /api/fractal/match');
    console.log('  GET  /api/fractal/explain');
    console.log('  GET  /api/fractal/explain/detailed');
    console.log('  GET  /api/fractal/overlay');
    console.log('  POST /api/fractal/admin/backtest');
    console.log('  POST /api/fractal/admin/autolearn/run');
    console.log('  POST /api/fractal/admin/autolearn/monitor');
    console.log('  GET  /api/fractal/admin/dataset');
    console.log('');
  } catch (err) {
    console.error('[Fractal] Fatal error:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Fractal] Fatal error:', err);
  process.exit(1);
});
