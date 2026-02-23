/**
 * UNIFIED FRACTAL ENDPOINT FOR SPX
 * 
 * Provides SPX data in BTC-compatible FractalSignalContract format.
 * Frontend can consume /api/fractal/spx exactly like /api/fractal/btc.
 * 
 * @module fractal/api/spx
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { buildSpxFocusPack, type SpxFocusPack } from '../../spx-core/spx-focus-pack.builder.js';
import { adaptSpxToFractal, type FractalSignalContract } from '../../spx/adapters/spx-to-fractal.adapter.js';
import { isValidSpxHorizon, type SpxHorizonKey } from '../../spx-core/spx-horizon.config.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SpxQueryParams {
  focus?: string;
  mode?: 'full' | 'compact';
}

interface SpxApiResponse {
  ok: boolean;
  symbol: 'SPX';
  focus: string;
  processingTimeMs: number;
  data: FractalSignalContract;
}

// ═══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════

export async function registerSpxUnifiedRoutes(fastify: FastifyInstance): Promise<void> {
  const prefix = '/api/fractal';

  /**
   * GET /api/fractal/spx
   * 
   * Returns SPX data in FractalSignalContract format (BTC-compatible).
   * This is the PRIMARY endpoint for frontend consumption.
   * 
   * Query params:
   * - focus: horizon (default: 30d) - 7d, 14d, 30d, 90d, 180d, 365d
   * - mode: 'full' | 'compact' (default: full)
   */
  fastify.get(`${prefix}/spx`, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as SpxQueryParams;
    const focus = query.focus || '30d';
    const mode = query.mode || 'full';
    
    // Validate horizon
    if (!isValidSpxHorizon(focus)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid horizon: ${focus}. Valid options: 7d, 14d, 30d, 90d, 180d, 365d`,
      });
    }
    
    try {
      const t0 = Date.now();
      
      // Step 1: Build SPX focus pack (native format)
      const focusPack: SpxFocusPack = await buildSpxFocusPack(focus as SpxHorizonKey);
      
      // Step 2: Adapt to FractalSignalContract (BTC-compatible)
      const fractalContract: FractalSignalContract = adaptSpxToFractal(focusPack);
      
      const processingTimeMs = Date.now() - t0;
      
      // Compact mode returns minimal data
      if (mode === 'compact') {
        return {
          ok: true,
          symbol: 'SPX',
          focus,
          processingTimeMs,
          data: {
            contract: fractalContract.contract,
            decision: fractalContract.decision,
            market: fractalContract.market,
            diagnostics: {
              similarity: fractalContract.diagnostics.similarity,
              quality: fractalContract.diagnostics.quality,
            },
          },
        };
      }
      
      // Full mode returns complete contract
      return {
        ok: true,
        symbol: 'SPX',
        focus,
        processingTimeMs,
        data: fractalContract,
      } as SpxApiResponse;
      
    } catch (error: any) {
      fastify.log.error(`[Fractal SPX] Error: ${error.message}`);
      
      if (error.message?.includes('INSUFFICIENT_DATA')) {
        return reply.code(503).send({
          ok: false,
          error: error.message,
          hint: 'SPX historical data not available. Run data ingestion first.',
        });
      }
      
      return reply.code(500).send({
        ok: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  /**
   * GET /api/fractal/spx/replay
   * 
   * Returns replay data for selected historical match.
   */
  fastify.get(`${prefix}/spx/replay`, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { focus?: string; matchIndex?: string };
    const focus = query.focus || '30d';
    const matchIndex = parseInt(query.matchIndex || '0', 10);
    
    if (!isValidSpxHorizon(focus)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid horizon: ${focus}`,
      });
    }
    
    try {
      const t0 = Date.now();
      const focusPack = await buildSpxFocusPack(focus as SpxHorizonKey);
      const fractalContract = adaptSpxToFractal(focusPack);
      
      const selectedMatch = fractalContract.explain.topMatches[matchIndex];
      if (!selectedMatch) {
        return reply.code(404).send({
          ok: false,
          error: `Match at index ${matchIndex} not found`,
        });
      }
      
      // Get overlay match for replay path
      const overlayMatch = focusPack.overlay.matches[matchIndex];
      
      return {
        ok: true,
        symbol: 'SPX',
        focus,
        processingTimeMs: Date.now() - t0,
        selectedMatch: {
          ...selectedMatch,
          replayPath: overlayMatch?.aftermathNormalized || [],
        },
        chartData: fractalContract.chartData,
      };
      
    } catch (error: any) {
      return reply.code(500).send({
        ok: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/fractal/spx/hybrid
   * 
   * Returns hybrid projection combining synthetic + primary match.
   */
  fastify.get(`${prefix}/spx/hybrid`, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { focus?: string };
    const focus = query.focus || '30d';
    
    if (!isValidSpxHorizon(focus)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid horizon: ${focus}`,
      });
    }
    
    try {
      const t0 = Date.now();
      const focusPack = await buildSpxFocusPack(focus as SpxHorizonKey);
      const fractalContract = adaptSpxToFractal(focusPack);
      
      return {
        ok: true,
        symbol: 'SPX',
        focus,
        processingTimeMs: Date.now() - t0,
        hybrid: {
          syntheticPath: fractalContract.chartData.path,
          bands: fractalContract.chartData.bands,
          primaryMatch: focusPack.primarySelection.primaryMatch,
          divergence: focusPack.divergence,
        },
        market: fractalContract.market,
        decision: fractalContract.decision,
      };
      
    } catch (error: any) {
      return reply.code(500).send({
        ok: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/fractal/spx/consensus
   * 
   * Returns multi-horizon consensus data.
   */
  fastify.get(`${prefix}/spx/consensus`, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const t0 = Date.now();
      
      // Build for multiple horizons
      const horizons: SpxHorizonKey[] = ['7d', '14d', '30d', '90d'];
      const results = await Promise.all(
        horizons.map(async (h) => {
          try {
            const pack = await buildSpxFocusPack(h);
            return {
              horizon: h,
              medianReturn: pack.overlay.stats.medianReturn,
              hitRate: pack.overlay.stats.hitRate,
              action: pack.overlay.stats.medianReturn > 0.02 ? 'LONG' : 
                      pack.overlay.stats.medianReturn < -0.02 ? 'SHORT' : 'HOLD',
              confidence: pack.diagnostics.reliability,
            };
          } catch {
            return {
              horizon: h,
              medianReturn: 0,
              hitRate: 0,
              action: 'HOLD' as const,
              confidence: 0,
            };
          }
        })
      );
      
      // Calculate consensus
      const actions = results.map(r => r.action);
      const longCount = actions.filter(a => a === 'LONG').length;
      const shortCount = actions.filter(a => a === 'SHORT').length;
      
      let consensusAction: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
      if (longCount >= 3) consensusAction = 'LONG';
      else if (shortCount >= 3) consensusAction = 'SHORT';
      
      const consensusStrength = Math.max(longCount, shortCount, actions.filter(a => a === 'HOLD').length) / horizons.length;
      
      return {
        ok: true,
        symbol: 'SPX',
        processingTimeMs: Date.now() - t0,
        consensus: {
          action: consensusAction,
          strength: consensusStrength,
          horizonBreakdown: results,
        },
      };
      
    } catch (error: any) {
      return reply.code(500).send({
        ok: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/fractal/spx/strategy
   * 
   * Returns strategy recommendation based on current signals.
   */
  fastify.get(`${prefix}/spx/strategy`, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { focus?: string; preset?: string };
    const focus = query.focus || '30d';
    const preset = (query.preset || 'BALANCED') as 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
    
    if (!isValidSpxHorizon(focus)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid horizon: ${focus}`,
      });
    }
    
    try {
      const t0 = Date.now();
      const focusPack = await buildSpxFocusPack(focus as SpxHorizonKey);
      const fractalContract = adaptSpxToFractal(focusPack);
      
      // Strategy multipliers by preset
      const presetMultipliers = {
        CONSERVATIVE: 0.5,
        BALANCED: 1.0,
        AGGRESSIVE: 1.5,
      };
      
      const baseSize = fractalContract.decision.sizeMultiplier;
      const adjustedSize = Math.min(1, baseSize * presetMultipliers[preset]);
      
      return {
        ok: true,
        symbol: 'SPX',
        focus,
        preset,
        processingTimeMs: Date.now() - t0,
        strategy: {
          action: fractalContract.decision.action,
          confidence: fractalContract.decision.confidence,
          positionSize: adjustedSize,
          entry: focusPack.price.current,
          stopLoss: focusPack.price.current * (1 - Math.abs(focusPack.overlay.stats.avgMaxDD) / 100),
          takeProfit: focusPack.price.current * (1 + focusPack.overlay.stats.medianReturn),
          horizon: focus,
          reasoning: fractalContract.explain.noTradeReasons.length > 0 
            ? fractalContract.explain.noTradeReasons 
            : ['Signals aligned for position'],
        },
        risk: fractalContract.risk,
        reliability: fractalContract.reliability,
      };
      
    } catch (error: any) {
      return reply.code(500).send({
        ok: false,
        error: error.message,
      });
    }
  });

  fastify.log.info(`[Fractal SPX] Unified routes registered at ${prefix}/spx/* (BTC-compatible contract)`);
}

export default registerSpxUnifiedRoutes;
