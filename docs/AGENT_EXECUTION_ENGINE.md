# Agentiom Agent Execution Engine

## Technical Documentation v1.2

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
   - [Executor](#executor)
   - [Scheduler](#scheduler)
   - [Demo Simulator](#demo-simulator)
4. [Advanced Modules](#advanced-modules)
   - [Position Sizing](#position-sizing)
   - [Trailing Stop-Loss](#trailing-stop-loss)
   - [Resilience (Retry & Circuit Breaker)](#resilience)
   - [Technical Analysis](#technical-analysis)
   - [Performance Statistics](#performance-statistics)
5. [Execution Flow](#execution-flow)
6. [LLM Integration](#llm-integration)
7. [Database Schema](#database-schema)
8. [Configuration](#configuration)
9. [Future Optimizations](#future-optimizations)

---

## Overview

The Agent Execution Engine is the autonomous trading brain of Agentiom. It enables AI agents to:

- Analyze market data using technical indicators
- Make trading decisions via LLM reasoning
- Execute trades with dynamic position sizing
- Manage risk with trailing stops and circuit breakers
- Operate in both demo (simulated) and live (Hyperliquid) modes

### Key Design Principles

1. **User Control**: Users define agent personality, strategy, and risk parameters
2. **LLM-Driven Decisions**: Trading decisions come from AI reasoning, not hardcoded rules
3. **Risk-First**: Multiple layers of risk management protect capital
4. **Resilience**: API failures don't crash the system
5. **Transparency**: All decisions are logged with reasoning

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SCHEDULER                                 │
│  - Manages execution intervals per agent                        │
│  - Runs agents in parallel                                      │
│  - Auto-stops inactive agents                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        EXECUTOR                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Market Data  │  │  Technical   │  │    LLM       │          │
│  │   Fetcher    │  │  Analysis    │  │  Integration │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌──────────────────────────────────────────────────┐          │
│  │              DECISION ENGINE                      │          │
│  │  - Combines technical signals + LLM reasoning    │          │
│  │  - Validates against user policies               │          │
│  │  - Calculates optimal position size              │          │
│  └──────────────────────────────────────────────────┘          │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │              TRADE EXECUTOR                       │          │
│  │  - Demo: Simulator    - Live: Hyperliquid API   │          │
│  │  - Trailing stop management                      │          │
│  │  - Position tracking                             │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RESILIENCE LAYER                            │
│  - Retry with exponential backoff                               │
│  - Circuit breaker for failing services                         │
│  - Timeout handling                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### Executor

**File**: `src/lib/agent/executor.ts`

The executor runs a single cycle of the trading loop:

```typescript
export async function executeAgentCycle(agentId: string): Promise<ExecutionResult[]>
```

#### Execution Steps

1. **Load Agent Config**: Fetch agent settings, policies, LLM config from database
2. **Get Account State**: Demo balance or live Hyperliquid account
3. **Check Trailing Stops**: Update stops for existing positions
4. **Gather Market Data**: Fetch prices + candles for approved pairs
5. **Calculate Technical Indicators**: RSI, MACD, Bollinger Bands, etc.
6. **LLM Market Analysis**: Overall sentiment and opportunity identification
7. **LLM Trading Decisions**: Per-market buy/sell/hold decisions
8. **Position Sizing**: Calculate optimal size based on strategy
9. **Execute Trades**: Via simulator (demo) or Hyperliquid API (live)
10. **Log Everything**: Decisions, executions, errors

#### Confidence Thresholds

Confidence threshold is now **user-configurable** via the Agent Settings UI slider (30%-90%).

| Mode | Default | Range | Reasoning |
|------|---------|-------|-----------|
| Demo | 50% | 30-90% | Allow more experimentation by default |
| Live | 70% | 30-90% | Require higher conviction for real money |

**UI Location**: Agent Settings → Minimum Confidence slider
**Visual Feedback**:
- 30-50%: Red "Aggressive" badge - more trades, lower conviction
- 51-70%: Yellow "Balanced" badge - moderate trade frequency
- 71-90%: Green "Conservative" badge - fewer trades, higher quality

### Scheduler

**File**: `src/lib/agent/scheduler.ts`

Manages automatic execution of active agents:

```typescript
// Start an agent's scheduler
startAgentScheduler(agentId: string, intervalSeconds: number = 300)

// Stop an agent
stopAgentScheduler(agentId: string)

// Initialize all active agents on server start
initializeAllSchedulers()

// Graceful shutdown
stopAllSchedulers()
```

#### Features

- **Configurable Intervals**: Default 5 minutes, user-adjustable (60s-3600s)
- **Auto-Stop**: Stops scheduler if agent becomes inactive
- **Concurrent Execution**: Multiple agents run independently
- **Last Execution Tracking**: Updates `lastExecutionAt` timestamp
- **Cost Estimation**: UI shows estimated daily LLM cost based on interval

#### Execution Interval Configuration

**UI Location**: Agent Settings → Execution Interval slider

| Setting | Value | Executions/Day | Cost Estimate |
|---------|-------|----------------|---------------|
| Minimum | 60s (1 min) | 1,440 | ~$28/day/symbol |
| Default | 300s (5 min) | 288 | ~$5.76/day/symbol |
| Maximum | 3600s (1 hour) | 24 | ~$0.48/day/symbol |

**Cost Formula**: `$0.02 per execution × executions/day × number of symbols`

The slider shows:
- Current interval formatted (e.g., "5m", "30m", "1h")
- Estimated daily cost badge (e.g., "~$5.76/day")
- Labels: "1 min" ↔ "1 hour", "Higher Cost" ↔ "Lower Cost"

### Demo vs Live Mode

Both demo and live agents use the **exact same execution engine**. The only difference is trade execution:

| Component | Demo Mode | Live Mode |
|-----------|-----------|-----------|
| Executor | `executeAgentCycle()` | `executeAgentCycle()` |
| Position Sizing | `calculateOptimalPositionSize()` | `calculateOptimalPositionSize()` |
| Trailing Stops | `checkAndUpdateTrailingStops()` | `checkAndUpdateTrailingStops()` |
| LLM Decisions | Same prompts & models | Same prompts & models |
| Technical Analysis | Same indicators | Same indicators |
| **Trade Execution** | `simulatePlaceOrder()` | `trader.placeOrder()` (Hyperliquid API) |
| **Account State** | `getDemoAccountState()` | `trader.getAccountState()` |
| Confidence Threshold | 50% | 70% |

This means:
- Position sizing strategies work identically in demo and live
- Trailing stop configurations work identically in demo and live
- Demo mode is a true simulation of live behavior with real market prices

### Demo Simulator

**File**: `src/lib/agent/demo-simulator.ts`

Simulates trading without real money:

```typescript
// Get simulated account state
getDemoAccountState(agentId: string): Promise<DemoAccountState>

// Place a simulated order
simulatePlaceOrder(agentId: string, params: OrderParams): Promise<DemoOrderResult>

// Close a position
simulateClosePosition(agentId: string, coin: string): Promise<DemoOrderResult>

// Check SL/TP triggers
checkDemoStopLossTakeProfit(agentId: string): Promise<void>
```

#### Simulation Features

- **Real Market Prices**: Uses live Hyperliquid prices for realism
- **Slippage Modeling**: 0.05% slippage on market orders
- **Margin Tracking**: Enforces collateral requirements
- **P&L Calculation**: Accurate unrealized/realized P&L
- **Stop-Loss/Take-Profit**: Automatic order execution

---

## Advanced Modules

### Position Sizing

**File**: `src/lib/agent/position-sizing.ts`

Dynamic position sizing based on account state and market conditions.

#### Strategies

##### 1. Fixed Fractional
```typescript
// Risk a fixed percentage of account per trade
maxPositionUsd = accountValue * (maxAccountPercent / 100)
```
- **Use Case**: Simple, predictable risk
- **Default**: 5% of account

##### 2. Kelly Criterion
```typescript
// Optimal for geometric growth
kellyPercent = winRate - ((1 - winRate) / avgWinLossRatio)
adjustedKelly = kellyPercent * kellyFraction  // Usually 0.25 for safety
```
- **Use Case**: Maximize long-term growth
- **Inputs**: Historical win rate, avg win/loss ratio
- **Safety**: Uses fractional Kelly (25%) to reduce volatility

##### 3. Volatility-Adjusted
```typescript
// Higher volatility = smaller position
volatilityFactor = 3 / Math.max(volatility, 0.5)
adjustedPercent = basePercent * volatilityFactor * multiplier
```
- **Use Case**: Adapt to market conditions
- **Inputs**: ATR or 24h price change

##### 4. Risk-Per-Trade
```typescript
// Fixed dollar amount at risk
sizeUsd = maxRisk / (stopLossPercent / 100)
```
- **Use Case**: Consistent dollar risk per trade
- **Example**: $100 risk with 3% stop = $3,333 position

#### Confidence Scaling

All strategies apply confidence scaling:
```typescript
finalSize = calculatedSize * (confidence / 100)
```

#### Policy Limits

Every calculation is capped by:
- Max position size USD (user setting)
- Max account percentage (user setting)
- Available collateral
- Minimum position size ($10)

### Trailing Stop-Loss

**File**: `src/lib/agent/trailing-stop.ts`

Dynamic stop-loss that locks in profits as price moves favorably.

#### Types

##### 1. Percentage Trailing
```typescript
// Stop trails high/low water mark by fixed %
newStopLoss = highWaterMark * (1 - trailPercent / 100)  // Long
newStopLoss = lowWaterMark * (1 + trailPercent / 100)   // Short
```
- **Default**: 2% trail
- **Profit Lock**: Tightens to 1% after 5% gain

##### 2. ATR Trailing
```typescript
// Stop trails by multiple of ATR
trailDistance = atr * atrMultiplier
newStopLoss = highWaterMark - trailDistance  // Long
```
- **Use Case**: Volatility-adaptive stops
- **Default**: 2x ATR

##### 3. Step Trailing
```typescript
// Move stop in increments at gain thresholds
steps = Math.floor(unrealizedPnlPercent / stepGain)
totalStepPercent = steps * stepPercent
newStopLoss = entryPrice * (1 + totalStepPercent / 100)
```
- **Default**: Move 1% for every 2% gain
- **Use Case**: Lock discrete profit levels

##### 4. Breakeven Stop
```typescript
// Move to breakeven after profit threshold
if (unrealizedPnlPercent >= breakevenTriggerPercent) {
  newStopLoss = entryPrice * (1 + feeBuffer)  // 0.1% for fees
}
```
- **Default**: Trigger at 2% profit
- **Result**: Risk-free trade after trigger

#### Water Mark Tracking

The system tracks highest (for longs) and lowest (for shorts) prices since entry:

```typescript
// Database columns added
highWaterMark: numeric('high_water_mark')
lowWaterMark: numeric('low_water_mark')
```

### Resilience

**File**: `src/lib/agent/resilience.ts`

Protects against API failures and cascading errors.

#### Retry with Exponential Backoff

```typescript
await withRetry(
  () => apiCall(),
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '429', '503']
  }
)
```

**Delay Calculation**:
```
Attempt 1: 1000ms
Attempt 2: 2000ms
Attempt 3: 4000ms
Attempt 4: 8000ms (capped at maxDelayMs)
```

#### Circuit Breaker

```typescript
await withCircuitBreaker(
  'hyperliquid.BTC',
  () => apiCall(),
  {
    failureThreshold: 5,    // Open after 5 failures
    successThreshold: 2,    // Close after 2 successes in half-open
    timeout: 30000          // Try again after 30s
  }
)
```

**States**:
- **Closed**: Normal operation, counting failures
- **Open**: Rejecting all calls, waiting for timeout
- **Half-Open**: Allowing test calls to check recovery

**Benefits**:
- Prevents hammering failing services
- Fast failure when service is down
- Automatic recovery testing

#### Combined Usage

```typescript
// Apply both retry and circuit breaker
const data = await withResilience(
  'hyperliquid.BTC',
  () => hyperliquid.getMarketData('BTC'),
  {
    retry: { maxRetries: 2 },
    circuit: { failureThreshold: 3 }
  }
)
```

### Technical Analysis

**File**: `src/lib/agent/technical-analysis.ts`

Calculates indicators from OHLCV candle data.

#### Indicators

| Indicator | Period | Signal |
|-----------|--------|--------|
| SMA | 20, 50 | Trend direction |
| EMA | 12, 26 | Faster trend |
| RSI | 14 | Overbought (>70) / Oversold (<30) |
| MACD | 12/26/9 | Momentum crossovers |
| Bollinger Bands | 20, 2σ | Volatility + mean reversion |
| ATR | 14 | Volatility measurement |
| VWAP | Session | Fair value reference |
| Volume | 20 | High volume detection |

#### Signal Generation

Each indicator generates signals with:
- **Direction**: bullish / bearish / neutral
- **Strength**: 0-100
- **Description**: Human-readable explanation

```typescript
if (rsi14 < 30) {
  signals.push({
    indicator: 'RSI',
    signal: 'bullish',
    strength: Math.min(100, (30 - rsi14) * 3),
    description: `RSI oversold at ${rsi14.toFixed(1)}`
  });
}
```

#### Support/Resistance

Automatically identifies key price levels from pivot points:

```typescript
const sr = calculateSupportResistance(candles);
// Returns:
// - supports: [95000, 92000, 88000]
// - resistances: [100000, 105000, 110000]
// - nearestSupport: 95000
// - nearestResistance: 100000
```

#### LLM Integration

Technical analysis is formatted for LLM prompts:

```typescript
const summary = formatIndicatorsForPrompt(indicators);
// Returns:
// Technical Analysis:
// - Moving Averages: SMA20=$97,500, SMA50=$94,200
// - RSI(14): 28.5 (oversold)
// - MACD: 0.0042 (bullish)
// - Bollinger Bands: Upper=$102,000, Lower=$93,000, Bandwidth=9.3%
// - ATR(14): $2,150
// - Volume: HIGH (145% vs avg)
// - Overall Trend: BULLISH
// - Signals:
//   • RSI: RSI oversold at 28.5
//   • MACD: MACD bullish crossover
```

### Performance Statistics

**File**: `src/lib/agent/performance-stats.ts`

Calculates comprehensive trading performance metrics from closed trades and balance history.

#### Core Metrics

```typescript
export interface PerformanceStats {
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;              // 0-100%

  // P&L Metrics
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;

  // Risk Metrics
  profitFactor: number;         // grossProfit / |grossLoss|
  expectancy: number;           // Expected $ per trade
  winLossRatio: number;         // avgWin / avgLoss

  // Drawdown Analysis
  maxDrawdown: number;          // Maximum peak-to-trough decline
  maxDrawdownPercent: number;   // As percentage

  // Trade Duration
  avgHoldTimeHours: number;
  longestWinHours: number;
  longestLossHours: number;

  // Equity Curve
  equityCurve: Array<{ timestamp: Date; equity: number }>;
}
```

#### API Endpoint

**GET** `/api/agents/[id]/stats`

Returns comprehensive performance statistics:

```typescript
{
  stats: PerformanceStats,
  summary: {
    currentBalance: number,
    unrealizedPnl: number,
    currentEquity: number,
    initialBalance: number,
    totalReturn: number,        // Percentage
    openPositions: number,
    isDemo: boolean,
    status: string
  }
}
```

#### UI Components

**AgentPerformanceStats Component** (`src/components/trading/AgentPerformanceStats.tsx`)
- Displays all metrics in a responsive grid
- Color-coded values (green for positive, red for negative)
- Compact mode for embedding in panels
- Auto-refresh capability

**AgentPerformanceChart Component** (`src/components/trading/AgentPerformanceChart.tsx`)
- Equity curve visualization
- Balance history line chart
- Interactive tooltips

#### Calculation Functions

```typescript
// Main calculation function
calculatePerformanceStats(
  trades: ClosedTrade[],
  balanceSnapshots: BalanceSnapshot[],
  initialBalance: number
): PerformanceStats

// Example metrics
winRate = (winningTrades / totalTrades) * 100
profitFactor = grossProfit / Math.abs(grossLoss)
expectancy = (winRate * avgWin) - ((1 - winRate) * Math.abs(avgLoss))
```

### LLM Cost Visibility

**UI Location**: Agent Settings → Today's AI Usage panel

Real-time visibility into LLM API costs per agent.

#### Metrics Displayed

| Metric | Description |
|--------|-------------|
| Total Cost | Sum of all LLM API costs (24h) |
| Total Calls | Number of LLM invocations |
| Analyses | Market analysis calls |
| Decisions | Trading decision calls |
| Input Tokens | Tokens sent to LLM |
| Output Tokens | Tokens received from LLM |

#### API Endpoint

**GET** `/api/agents/[id]/llm-usage?period=24h`

```typescript
{
  stats: {
    totalCalls: number,
    totalInputTokens: number,
    totalOutputTokens: number,
    totalCost: number,
    avgLatency: number,
    successRate: number
  },
  byTask: Array<{
    taskType: 'analysis' | 'decision',
    calls: number,
    cost: number
  }>
}
```

#### Database Table

```sql
llm_usage (
  id, agentId, userId,
  model, provider, taskType,
  inputTokens, outputTokens, totalTokens,
  costUsd, latencyMs, success,
  createdAt
)
```

---

## Execution Flow

### Complete Cycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     START CYCLE                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. LOAD AGENT CONFIG                                            │
│    - Fetch from database                                        │
│    - Parse policies, LLM config                                 │
│    - Check status == 'active'                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. GET ACCOUNT STATE                                            │
│    Demo: getDemoAccountState() → simulated balance              │
│    Live: trader.getAccountState() → Hyperliquid account         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CHECK TRAILING STOPS                                         │
│    For each open position:                                      │
│    - Update high/low water marks                                │
│    - Calculate new stop level                                   │
│    - Close if triggered                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. GATHER MARKET DATA (with resilience)                         │
│    For each approved pair:                                      │
│    - Fetch current price, funding, volume                       │
│    - Fetch 100 hourly candles                                   │
│    - Calculate technical indicators                             │
│    - Identify support/resistance                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. LLM MARKET ANALYSIS                                          │
│    Prompt includes:                                             │
│    - Agent personality & strategy                               │
│    - Account balance & positions                                │
│    - All market data + technical analysis                       │
│    Output: sentiment, volatility, opportunities                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. LLM TRADING DECISIONS (per market)                           │
│    Prompt includes:                                             │
│    - Previous analysis context                                  │
│    - Specific market data                                       │
│    - Existing position (if any)                                 │
│    Output: action, size, leverage, SL/TP, confidence            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. VALIDATE & SIZE                                              │
│    - Check confidence >= threshold                              │
│    - Validate against policies                                  │
│    - Calculate optimal position size                            │
│    - Apply confidence scaling                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. EXECUTE TRADES                                               │
│    Demo: simulatePlaceOrder() / simulateClosePosition()         │
│    Live: trader.placeOrder() / trader.closePosition()           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. LOG & SNAPSHOT                                               │
│    - Log all decisions with reasoning                           │
│    - Save balance snapshot for charts                           │
│    - Update lastExecutionAt                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      END CYCLE                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## LLM Integration

### Model Selection

The system supports multiple LLM providers:

| Provider | Models | Use Case |
|----------|--------|----------|
| Anthropic | Claude Sonnet 4, Claude Opus | Complex analysis |
| OpenAI | GPT-4o, GPT-4o-mini | Fast decisions |
| DeepSeek | DeepSeek Chat V3.1 | Cost-effective |
| Google | Gemini Pro | Alternative |
| X.AI | Grok | Alternative |

### Auto-Selection

```typescript
// Configured in agent.llmConfig
{
  primaryModel: 'claude-sonnet-4-20250514',  // Complex decisions
  simpleModel: 'gpt-4o-mini',                 // Simple tasks
  analysisModel: 'deepseek-chat',             // Market analysis
  autoSelect: true
}
```

### Prompt Structure

#### Market Analysis Prompt
```
You are an autonomous cryptocurrency trading agent...

Agent Configuration:
- Name: {name}
- Strategy: {user's custom strategy prompt}
- Account Balance: $X
- Risk Parameters: ...

Current Positions: ...

Market Data:
BTC:
  Price: $97,500 (+2.3%)
  24h Volume: $45.2B
  Funding Rate: 0.0045%

{Technical Analysis from formatIndicatorsForPrompt()}

Analyze and respond with JSON...
```

#### Trading Decision Prompt
```
Agent: {name}
Strategy: {user's custom strategy prompt}

Risk Parameters:
- Max Position Size: $1,000
- Max Leverage: 10x
- Stop Loss: 3%

Current Position in BTC: ...

Market Data for BTC: ...
{Technical Analysis}

Previous Analysis: {market analysis output}

Decide what action to take. Respond with JSON...
```

### Response Parsing

Robust JSON extraction handles various LLM output formats:

```typescript
function parseJsonResponse<T>(response: string): T | null {
  // Try direct parse
  // Try markdown code block extraction
  // Try JSON object pattern matching
  return parsed;
}
```

### Usage Tracking

All LLM calls are tracked for cost monitoring:

```typescript
await db.insert(llmUsage).values({
  agentId,
  userId,
  model: 'claude-sonnet-4-20250514',
  provider: 'anthropic',
  taskType: 'decision',
  inputTokens: 1250,
  outputTokens: 380,
  totalTokens: 1630,
  costUsd: '0.024500',
  latencyMs: 2340,
  success: true
});
```

---

## Database Schema

### Key Tables

#### `agents`
```sql
- id, userId, name
- isDemo, demoBalance
- personality, strategy           -- User's custom prompts
- policies (JSONB)               -- Risk limits
- llmConfig (JSONB)              -- Model preferences
- executionInterval              -- Seconds between cycles
- status                         -- 'active' | 'paused'
- lastExecutionAt
```

#### `positions`
```sql
- id, agentId, symbol, side
- size, sizeUsd, entryPrice, markPrice
- leverage, unrealizedPnl, realizedPnl
- takeProfit, stopLoss
- highWaterMark, lowWaterMark    -- NEW: Trailing stop tracking
- status, entryReasoning, exitReasoning
- openedAt, closedAt
```

#### `agent_logs`
```sql
- id, agentId, logType
- symbol, content
- decision (JSONB)               -- Full decision details
- confidence, marketData (JSONB)
- createdAt
```

#### `llm_usage`
```sql
- id, agentId, userId
- model, provider, taskType
- inputTokens, outputTokens, totalTokens
- costUsd, latencyMs, success
- createdAt
```

#### `balance_snapshots`
```sql
- id, agentId
- balance, unrealizedPnl
- timestamp
```

---

## Configuration

### Agent Policies (User-Configurable)

```typescript
{
  maxLeverage: 10,              // Maximum leverage allowed
  maxPositionSizeUsd: 1000,     // Max position in USD
  maxPositionSizePct: 10,       // Max position as % of account
  maxDrawdownPct: 20,           // Stop trading if drawdown exceeds
  approvedPairs: ['BTC', 'ETH', 'SOL'],
  tradingHours: { start: 0, end: 24 },  // Optional

  // Position Sizing Strategy (NEW - user selectable in UI)
  positionSizing: {
    strategy: 'fixed_fractional',  // 'fixed_fractional' | 'kelly_criterion' | 'volatility_adjusted' | 'risk_per_trade'
    maxRiskPerTrade: 100,          // For risk_per_trade strategy
    kellyFraction: 0.25,           // For kelly_criterion (0.1-1.0)
    volatilityMultiplier: 1.5      // For volatility_adjusted
  },

  // Trailing Stop Configuration (NEW - user selectable in UI)
  trailingStop: {
    enabled: true,
    type: 'percentage',            // 'percentage' | 'atr' | 'step' | 'breakeven'
    trailPercent: 2,               // For percentage type
    atrMultiplier: 2,              // For atr type
    stepPercent: 1,                // For step type (lock X% per step)
    stepGain: 2,                   // For step type (trigger every X% gain)
    breakevenTriggerPercent: 2     // For breakeven type
  }
}
```

### LLM Configuration (User-Configurable)

```typescript
{
  primaryModel: 'claude-sonnet-4-20250514',
  simpleModel: 'gpt-4o-mini',
  analysisModel: 'deepseek-chat',
  autoSelect: true,
  parameters: {
    temperature: 0.3,           // Lower = more consistent
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    maxTokens: 4096
  }
}
```

### System Configuration (Code-Level)

```typescript
// Position Sizing Defaults
const DEFAULT_CONFIG: PositionSizingConfig = {
  strategy: 'fixed_fractional',
  maxAccountPercent: 5,
  maxRiskPerTrade: 100,
  kellyFraction: 0.25,
  volatilityMultiplier: 1.5
};

// Trailing Stop Defaults
const DEFAULT_CONFIG: TrailingStopConfig = {
  type: 'percentage',
  trailPercent: 2,
  lockProfitPercent: 5,
  lockProfitTrailPercent: 1
};

// Resilience Defaults
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

const DEFAULT_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000
};
```

---

## Future Optimizations

### Completed (v1.2)

#### ✅ 1. Position Sizing Strategy Selection (v1.1)
Users can now select from 4 strategies in Agent Settings:
- **Fixed Percentage**: Risk a fixed % of account per trade (simple, predictable)
- **Kelly Criterion**: Optimize position size based on historical win rate (growth-optimized)
- **Volatility-Adjusted**: Smaller positions in volatile markets (adaptive)
- **Fixed Risk**: Risk $X per trade regardless of setup (consistent risk)

**UI Location**: Agent Settings → Position Sizing Strategy dropdown
**API**: `PATCH /api/agents/[id]/trading-config` with `positionSizing` payload
**Executor**: Reads `agent.policies.positionSizing.strategy` and applies in `calculateOptimalPositionSize()`

#### ✅ 2. Trailing Stop Configuration (v1.1)
Users can now configure trailing stop behavior in Agent Settings:
- **Fixed**: No trailing - stop stays where it was set
- **Trailing %**: Follows price by X%, locks in profits dynamically
- **Trailing ATR**: Follows price by ATR × multiplier (volatility-adaptive)
- **Breakeven**: Moves stop to entry price after X% profit threshold
- **Step**: Locks profit in increments (e.g., every 2% gain, lock 1%)

**UI Location**: Agent Settings → Stop-Loss Type dropdown (with enable/disable toggle)
**API**: `PATCH /api/agents/[id]/trading-config` with `trailingStop` payload
**Executor**: Reads `agent.policies.trailingStop` and applies in `checkAndUpdateTrailingStops()`

#### ✅ 3. Performance Statistics Dashboard (v1.2)
Comprehensive trading metrics calculated from closed trades:
- **Trade Stats**: Win rate, total trades, winning/losing count
- **P&L Metrics**: Total P&L, avg win/loss, profit factor, expectancy
- **Risk Metrics**: Max drawdown, win/loss ratio
- **Duration**: Average hold time, longest win/loss

**UI Location**: Terminal Panel → STATS tab, Performance Chart on agent page
**API**: `GET /api/agents/[id]/stats`
**Components**: `AgentPerformanceStats`, `AgentPerformanceChart`

#### ✅ 4. Confidence Threshold Slider (v1.2)
User-configurable minimum confidence for trade execution:
- **Range**: 30% (aggressive) to 90% (conservative)
- **Visual feedback**: Color-coded badges (red/yellow/green)
- **Impact**: Controls trade frequency vs quality tradeoff

**UI Location**: Agent Settings → Minimum Confidence slider
**Executor**: Filters decisions below `policies.confidenceThreshold`

#### ✅ 5. Execution Interval Guardrails (v1.2)
User-configurable interval with cost awareness:
- **Range**: 60 seconds (1 min) to 3600 seconds (1 hour)
- **Cost estimate**: Shows estimated daily LLM cost based on interval
- **Formula**: `$0.02 × executions/day × symbols`

**UI Location**: Agent Settings → Execution Interval slider
**Scheduler**: Reads `agent.executionInterval` for timer interval

#### ✅ 6. LLM Cost Visibility (v1.2)
Real-time view of AI usage costs:
- **Today's cost**: Total $ spent on LLM calls (24h)
- **Breakdown**: Analyses vs decisions, input/output tokens
- **Refresh**: Manual refresh button for latest data

**UI Location**: Agent Settings → Today's AI Usage panel
**API**: `GET /api/agents/[id]/llm-usage?period=24h`

#### ✅ 7. Risk Management Module (v1.2)
Comprehensive safety guardrails in `src/lib/agent/risk-management.ts`:

**Decision Deduplication**
- Prevents duplicate trades within cooldown period (default: 5 minutes)
- In-memory cache per agent tracking recent decisions
- Checks action + symbol combination

**Max Concurrent Positions**
- Limits total open positions (default: 5)
- Correlated asset groups limit exposure to related assets (default: 3 per group)
- Groups: BTC | ETH/SOL/AVAX/MATIC | DOGE/SHIB/PEPE | BNB | XRP/XLM

**Max Drawdown Emergency Stop**
- Tracks peak balance per agent
- Auto-pauses agent when drawdown exceeds threshold (default: 20%)
- Logs emergency stop with reason
- Warning zone at 80% of max drawdown

**Integration**
```typescript
// In executor.ts - before every trade
const riskCheck = await performRiskChecks(
  agentId, action, symbol, currentBalance, riskConfig
);

if (riskCheck.shouldStopAgent) {
  await emergencyStopAgent(agentId, riskCheck.reasons.join('; '));
  return; // Stop execution immediately
}

if (!riskCheck.allowed) {
  // Log reason and skip trade
  continue;
}

// After successful trade - record for deduplication
recordDecision(agentId, action, symbol);
```

**Executor**: Integrated into `executeAgentCycle()` at step 8a
**Module**: `src/lib/agent/risk-management.ts`

### Medium Priority

#### 8. Multi-Timeframe Analysis
Currently uses 1h candles only. Add:
- 15m for entry timing
- 4h for trend confirmation
- 1D for major S/R levels

#### 9. Sentiment Data Integration
Add external data sources:
- Fear & Greed Index
- Social sentiment (Twitter, Reddit)
- Funding rate trends
- Liquidation data

#### 10. Portfolio-Level Risk Management
Currently per-position. Add:
- Total portfolio exposure limits
- Correlation-aware sizing
- Sector concentration limits

#### 11. Backtesting Engine
Simulate agent performance on historical data:
- Test strategy changes before deploying
- Optimize parameters
- Estimate performance metrics

### Lower Priority

#### 12. Agent Evolution (Genetic Algorithms)
Use `agent_genomes` table for:
- Mutation of successful strategies
- Crossover between top performers
- Tournament selection

#### 13. Real-Time Execution
Currently interval-based. Add:
- WebSocket price streaming
- Event-triggered execution
- Faster response to market moves

#### 14. Order Type Expansion
Currently market orders only. Add:
- Limit orders with patience
- Stop-limit entries
- Scaled entry/exit
- TWAP for large positions

#### 15. Market Regime Detection
Classify market conditions before making decisions:
- TRENDING_UP: Clear uptrend, buy dips
- TRENDING_DOWN: Clear downtrend, sell rallies
- RANGING: Sideways, mean reversion works
- HIGH_VOLATILITY: Choppy, reduce size
- LOW_VOLATILITY: Quiet, breakout possible

This affects how the agent should trade (different strategies per regime).

#### 16. Recent Trade History in Prompt
Include recent trades for context to prevent revenge trading:
- Last N trades with entry/exit prices
- P&L results
- Prevents overtrading same setup
- LLM considers recent context when deciding

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `src/lib/agent/executor.ts` | Main execution loop |
| `src/lib/agent/scheduler.ts` | Interval-based agent runner |
| `src/lib/agent/demo-simulator.ts` | Simulated trading |
| `src/lib/agent/position-sizing.ts` | Dynamic position sizing |
| `src/lib/agent/trailing-stop.ts` | Trailing stop-loss |
| `src/lib/agent/resilience.ts` | Retry + circuit breaker |
| `src/lib/agent/technical-analysis.ts` | Technical indicators |
| `src/lib/agent/performance-stats.ts` | Performance metrics calculation |
| `src/lib/agent/risk-management.ts` | Risk guardrails (dedup, limits, emergency stop) |
| `src/lib/agent/index.ts` | Module exports |
| `src/lib/llm/index.ts` | LLM provider integration |
| `src/lib/llm/prompts.ts` | Trading prompt templates |
| `src/lib/hyperliquid/` | Exchange integration |
| `src/lib/db/schema.ts` | Database schema |
| `src/app/api/agents/[id]/stats/route.ts` | Performance stats API |
| `src/app/api/agents/[id]/llm-usage/route.ts` | LLM usage API |
| `src/components/trading/AgentPerformanceStats.tsx` | Stats display component |
| `src/components/trading/AgentPerformanceChart.tsx` | Equity chart component |
| `src/components/trading/SimpleAgentSettings.tsx` | Agent settings panel |

---

*Last Updated: December 2024*
*Version: 1.2*

### Changelog

**v1.2** (December 2024)
- Added Performance Statistics module (`performance-stats.ts`)
  - Comprehensive metrics: win rate, profit factor, expectancy, max drawdown
  - API endpoint: `GET /api/agents/[id]/stats`
  - UI components: `AgentPerformanceStats`, `AgentPerformanceChart`
  - Terminal Panel now has STATS tab
- Added Confidence Threshold slider (30-90%)
  - User can adjust trade frequency vs quality
  - Visual feedback with color-coded badges
  - Connected to executor decision filtering
- Added Execution Interval slider with guardrails
  - Range: 60s (1 min) to 3600s (1 hour)
  - Shows estimated daily LLM cost
  - Connected to scheduler timer
- Added LLM Cost Visibility panel
  - Today's AI usage: cost, calls, tokens
  - Breakdown by task type (analysis vs decision)
  - Manual refresh button
- Added Risk Management module (`risk-management.ts`)
  - Decision deduplication with 5-minute cooldown
  - Max concurrent positions (default: 5)
  - Correlated asset groups limit (default: 3 per group)
  - Max drawdown emergency stop with auto-pause
  - Integrated into executor pre-trade checks

**v1.1** (December 2024)
- Added user-configurable Position Sizing Strategy dropdown (4 strategies)
- Added user-configurable Stop-Loss Type dropdown (5 types + enable toggle)
- Wired UI settings to executor - selections now affect actual trading behavior
- Added Demo vs Live Mode comparison table
- Both demo and live agents share the same execution engine
