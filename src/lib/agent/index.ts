// Core executor and scheduler
export { executeAgentCycle } from './executor';
export {
  startAgentScheduler,
  stopAgentScheduler,
  isAgentSchedulerRunning,
  getRunningAgents,
  initializeAllSchedulers,
  stopAllSchedulers,
} from './scheduler';

// Demo trading simulator
export {
  getDemoAccountState,
  simulatePlaceOrder,
  simulateClosePosition,
  checkDemoStopLossTakeProfit,
  getDemoMarketData,
} from './demo-simulator';

// Position sizing strategies
export {
  calculatePositionSize,
  calculateTradeStatistics,
  type PositionSizingConfig,
  type PositionSizingStrategy,
  type PositionSizingInput,
  type PositionSizingResult,
} from './position-sizing';

// Trailing stop-loss
export {
  calculateTrailingStop,
  updateWaterMarks,
  type TrailingStopConfig,
  type TrailingStopType,
  type TrailingStopInput,
  type TrailingStopResult,
} from './trailing-stop';

// Resilience (retry + circuit breaker)
export {
  withRetry,
  withCircuitBreaker,
  withResilience,
  withTimeout,
  getCircuitStatus,
  resetCircuit,
  getAllCircuitStatuses,
  CircuitBreakerError,
  TimeoutError,
} from './resilience';

// Technical analysis
export {
  calculateIndicators,
  calculateSupportResistance,
  formatIndicatorsForPrompt,
  type Candle,
  type TechnicalIndicators,
  type TechnicalSignal,
  type SupportResistance,
} from './technical-analysis';

// Risk management
export {
  performRiskChecks,
  isDuplicateDecision,
  recordDecision,
  clearDecisionCache,
  checkPositionLimits,
  getOpenPositionCount,
  checkDrawdownLimit,
  emergencyStopAgent,
  resetPeakBalance,
  type RiskConfig,
  type RiskCheckResult,
  DEFAULT_RISK_CONFIG,
} from './risk-management';

// Performance statistics
export {
  calculatePerformanceStats,
  type PerformanceStats,
  type ClosedTrade,
  type BalanceSnapshot,
} from './performance-stats';
