/**
 * Structured Logger for Agent Execution
 *
 * Provides structured logging with context for observability:
 * - Consistent log format across all agent operations
 * - Contextual information (agentId, cycle, symbol, etc.)
 * - Performance timing helpers
 * - Easy filtering and searching
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  agentId?: string;
  cycle?: number;
  symbol?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  durationMs?: number;
}

// ==================== Configuration ====================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to 'info' in production, 'debug' in development
const minLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const minLevelNum = LOG_LEVELS[minLevel];

// ==================== Core Logger ====================

function formatLog(entry: LogEntry): string {
  const contextStr = Object.keys(entry.context).length > 0
    ? ` ${JSON.stringify(entry.context)}`
    : '';
  const durationStr = entry.durationMs !== undefined
    ? ` (${entry.durationMs}ms)`
    : '';

  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${durationStr}${contextStr}`;
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LOG_LEVELS[level] < minLevelNum) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

// ==================== Public API ====================

export const logger = {
  debug: (message: string, context: LogContext = {}) => log('debug', message, context),
  info: (message: string, context: LogContext = {}) => log('info', message, context),
  warn: (message: string, context: LogContext = {}) => log('warn', message, context),
  error: (message: string, context: LogContext = {}) => log('error', message, context),
};

// ==================== Agent-Specific Loggers ====================

/**
 * Create a logger bound to a specific agent
 */
export function createAgentLogger(agentId: string) {
  const withAgent = (context: LogContext = {}): LogContext => ({
    agentId,
    ...context,
  });

  return {
    debug: (message: string, context: LogContext = {}) =>
      logger.debug(message, withAgent(context)),
    info: (message: string, context: LogContext = {}) =>
      logger.info(message, withAgent(context)),
    warn: (message: string, context: LogContext = {}) =>
      logger.warn(message, withAgent(context)),
    error: (message: string, context: LogContext = {}) =>
      logger.error(message, withAgent(context)),

    // Execution cycle helpers
    cycleStart: (cycle: number, context: LogContext = {}) =>
      logger.info('Execution cycle started', withAgent({ cycle, ...context })),

    cycleEnd: (cycle: number, results: { trades: number; llmCost: number }, durationMs: number) =>
      logger.info('Execution cycle completed', withAgent({
        cycle,
        trades: results.trades,
        llmCost: results.llmCost,
        durationMs,
      })),

    // Market analysis helpers
    analysisStart: (symbols: string[]) =>
      logger.debug('Starting market analysis', withAgent({ symbols })),

    analysisResult: (sentiment: string, volatility: string, latencyMs: number) =>
      logger.info('Market analysis completed', withAgent({
        sentiment,
        volatility,
        latencyMs,
      })),

    // Decision helpers
    decisionReceived: (symbol: string, action: string, confidence: number, latencyMs: number) =>
      logger.info('LLM decision received', withAgent({
        symbol,
        action,
        confidence,
        latencyMs,
      })),

    decisionBlocked: (symbol: string, action: string, reason: string) =>
      logger.warn('Decision blocked by risk check', withAgent({
        symbol,
        action,
        reason,
      })),

    // Trade execution helpers
    tradeExecuted: (symbol: string, action: string, size: number, result: { success: boolean; orderId?: string }) =>
      logger.info('Trade executed', withAgent({
        symbol,
        action,
        size,
        success: result.success,
        orderId: result.orderId,
      })),

    tradeError: (symbol: string, action: string, error: string) =>
      logger.error('Trade execution failed', withAgent({
        symbol,
        action,
        error,
      })),

    // Risk helpers
    riskWarning: (warning: string, details: LogContext = {}) =>
      logger.warn('Risk warning', withAgent({ warning, ...details })),

    emergencyStop: (reason: string) =>
      logger.error('EMERGENCY STOP', withAgent({ reason })),

    // Regime detection
    regimeDetected: (symbol: string, regime: string, confidence: number) =>
      logger.debug('Market regime detected', withAgent({
        symbol,
        regime,
        confidence,
      })),
  };
}

// ==================== Timing Helpers ====================

/**
 * Time an async operation and return result with duration
 */
export async function timed<T>(
  operation: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await operation();
  const durationMs = Date.now() - start;
  return { result, durationMs };
}

/**
 * Create a timer for manual start/stop
 */
export function createTimer() {
  let startTime: number | null = null;

  return {
    start: () => {
      startTime = Date.now();
    },
    stop: (): number => {
      if (startTime === null) return 0;
      return Date.now() - startTime;
    },
    elapsed: (): number => {
      if (startTime === null) return 0;
      return Date.now() - startTime;
    },
  };
}

// ==================== Metrics Helpers ====================

/**
 * Simple in-memory metrics for the current process
 * (For production, consider sending to external service)
 */
const metrics = {
  executionCycles: 0,
  tradesExecuted: 0,
  tradesFailed: 0,
  llmCalls: 0,
  llmTotalCost: 0,
  llmTotalLatencyMs: 0,
  riskBlocks: 0,
  emergencyStops: 0,
};

export const agentMetrics = {
  incrementCycles: () => metrics.executionCycles++,
  incrementTrades: (success: boolean) => {
    if (success) metrics.tradesExecuted++;
    else metrics.tradesFailed++;
  },
  recordLLMCall: (cost: number, latencyMs: number) => {
    metrics.llmCalls++;
    metrics.llmTotalCost += cost;
    metrics.llmTotalLatencyMs += latencyMs;
  },
  incrementRiskBlock: () => metrics.riskBlocks++,
  incrementEmergencyStop: () => metrics.emergencyStops++,
  getMetrics: () => ({
    ...metrics,
    llmAvgLatencyMs: metrics.llmCalls > 0
      ? Math.round(metrics.llmTotalLatencyMs / metrics.llmCalls)
      : 0,
    tradeSuccessRate: metrics.tradesExecuted + metrics.tradesFailed > 0
      ? Math.round((metrics.tradesExecuted / (metrics.tradesExecuted + metrics.tradesFailed)) * 100)
      : 0,
  }),
  reset: () => {
    metrics.executionCycles = 0;
    metrics.tradesExecuted = 0;
    metrics.tradesFailed = 0;
    metrics.llmCalls = 0;
    metrics.llmTotalCost = 0;
    metrics.llmTotalLatencyMs = 0;
    metrics.riskBlocks = 0;
    metrics.emergencyStops = 0;
  },
};
