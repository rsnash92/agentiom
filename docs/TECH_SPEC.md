# Agentiom Technical Specification

## AI Trading Agents for Hyperliquid Perpetual Futures

### Executive Summary

Agentiom is an AI trading terminal that enables users to deploy autonomous trading agents on Hyperliquid. This document outlines the technical architecture, core systems, and implementation details.

**Core Concept:** Users interact with AI agents via natural language to define trading strategies. Agents analyze markets, execute trades, and manage positions 24/7 with full transparency.

---

## Part 1: Core Concepts

### Agents

Intelligent trading bots with their own identity, wallet, and strategy:

```typescript
interface Agent {
  id: string;
  userId: string;
  name: string;

  // Wallet
  walletAddress: string;
  apiKeyEncrypted: string;        // AES-256 encrypted

  // Strategy Definition
  personality: string;            // Natural language persona
  strategy: string;               // Trading approach description
  tasks: Task[];                  // Executable task definitions
  adaptations: Adaptation[];      // Learned behavioral modifications

  // Risk Policies
  policies: {
    maxLeverage: number;          // 1-50
    maxPositionSizeUsd: number;
    maxPositionSizePct: number;   // % of account
    maxDrawdownPct: number;
    approvedPairs: string[];
    tradingHours?: { start: number; end: number };
  };

  // Configuration
  llmProvider: 'claude' | 'gpt4' | 'gemini' | 'deepseek' | 'grok';
  dataWeights: Record<string, number>;  // Signal importance

  // State
  status: 'active' | 'paused' | 'stopped';
  genome: AgentGenome;            // Evolved configuration

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Tasks (Step-Based Execution)

Unlike continuous execution loops, agents execute discrete **Tasks** with explicit validation steps. Each task defines a complete trading action with conditions that must pass sequentially:

```typescript
interface Task {
  id: string;
  agentId: string;
  name: string;                   // "Execute Short at Upper Bollinger Band"
  description: string;            // Brief summary
  priority: number;               // 1-10 (higher = checked first)
  status: 'active' | 'paused';

  // Multi-step execution
  steps: TaskStep[];

  // Performance tracking
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgCreditsPerRun: number;
  lastTriggeredAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface TaskStep {
  id: string;
  order: number;                  // 1, 2, 3...
  name: string;                   // "VALIDATE RANGING CONDITIONS"
  description: string;            // "Check ADX < 25 and price within bands"

  // Condition to pass before proceeding
  condition: {
    type: 'indicator' | 'price' | 'time' | 'position' | 'custom';
    indicator?: string;           // "ADX", "RSI", "MACD"
    operator: '<' | '>' | '==' | 'between' | 'crosses_above' | 'crosses_below';
    value: number | [number, number];
    timeframe?: string;           // "1h", "4h", "1d"
  };

  // Action if condition passes (only on final step)
  action?: {
    type: 'open_long' | 'open_short' | 'close' | 'add' | 'reduce';
    sizePercent?: number;         // % of available balance
    sizeUsd?: number;             // Fixed USD amount
    leverage?: number;
    takeProfitPercent?: number;
    stopLossPercent?: number;
  };
}
```

**Example Task: Bollinger Band Short**
```typescript
const bollingerShortTask: Task = {
  id: 'task-1',
  agentId: 'agent-1',
  name: 'Execute Short at Upper Bollinger Band',
  description: 'EXECUTE SHORT TRADE at upper Bollinger Band',
  priority: 1,
  status: 'active',
  steps: [
    {
      id: 'step-1',
      order: 1,
      name: 'VALIDATE RANGING CONDITIONS',
      description: 'Check ADX < 25 and price within bands',
      condition: {
        type: 'indicator',
        indicator: 'ADX',
        operator: '<',
        value: 25,
        timeframe: '4h'
      }
    },
    {
      id: 'step-2',
      order: 2,
      name: 'CONFIRM UPPER BAND TOUCH',
      description: 'Price must be within 0.5% of upper band',
      condition: {
        type: 'indicator',
        indicator: 'BB_UPPER_DISTANCE',
        operator: '<',
        value: 0.5  // percent
      }
    },
    {
      id: 'step-3',
      order: 3,
      name: 'CHECK RSI OVERBOUGHT',
      description: 'RSI > 70 confirms reversal potential',
      condition: {
        type: 'indicator',
        indicator: 'RSI',
        operator: '>',
        value: 70,
        timeframe: '4h'
      }
    },
    {
      id: 'step-4',
      order: 4,
      name: 'EXECUTE SHORT',
      description: 'Open short with 2x leverage, 5% position size',
      condition: {
        type: 'position',
        operator: '==',
        value: 0  // No existing position
      },
      action: {
        type: 'open_short',
        sizePercent: 5,
        leverage: 2,
        takeProfitPercent: 3,
        stopLossPercent: 1.5
      }
    }
  ],
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  avgCreditsPerRun: 0,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### Workflow Adaptations

Adaptations are learned behavioral modifications that evolve based on agent performance. Unlike tasks (which are user-defined), adaptations emerge from the agent's trading history:

```typescript
interface Adaptation {
  id: string;
  agentId: string;
  name: string;                   // "Avoid Monday Opens"
  description: string;            // "Reduce position size on Monday opens due to 65% loss rate"

  status: 'active' | 'paused' | 'disabled';

  // How confident the agent is in this adaptation
  confidence: number;             // 0-100%

  // Performance metrics
  successRate: number;            // % of times adaptation improved outcome
  totalApplications: number;

  // What triggers this adaptation
  trigger: {
    type: 'time' | 'volatility' | 'drawdown' | 'streak' | 'indicator';
    condition: string;            // Natural language or structured
  };

  // What the adaptation does
  modification: {
    type: 'skip_trade' | 'reduce_size' | 'increase_confirmation' | 'widen_stops';
    factor?: number;              // e.g., 0.5 for 50% size reduction
  };

  // How it was learned
  learnedFrom: string;            // "3 consecutive losses on Monday opens"
  learnedAt: Date;
  lastTriggeredAt?: Date;
}
```

**Example Adaptations:**
```typescript
const adaptations: Adaptation[] = [
  {
    id: 'adapt-1',
    agentId: 'agent-1',
    name: 'High Volatility Caution',
    description: 'Reduce position size by 50% when VIX > 30',
    status: 'active',
    confidence: 78,
    successRate: 72,
    totalApplications: 23,
    trigger: {
      type: 'volatility',
      condition: 'VIX > 30 or 24h price change > 8%'
    },
    modification: {
      type: 'reduce_size',
      factor: 0.5
    },
    learnedFrom: '4 large losses during high volatility periods',
    learnedAt: new Date('2025-01-15')
  },
  {
    id: 'adapt-2',
    agentId: 'agent-1',
    name: 'Losing Streak Pause',
    description: 'Skip trades after 3 consecutive losses',
    status: 'active',
    confidence: 85,
    successRate: 68,
    totalApplications: 8,
    trigger: {
      type: 'streak',
      condition: 'consecutive_losses >= 3'
    },
    modification: {
      type: 'skip_trade'
    },
    learnedFrom: 'Recovery pattern after cooling off periods',
    learnedAt: new Date('2025-02-01')
  }
];
```

### Policies

Risk guardrails enforced before execution:

```typescript
interface PolicyCheck {
  passed: boolean;
  violations: string[];
  adjustedDecision?: Decision;    // Modified to comply
}

function validateDecision(decision: Decision, policies: Policies): PolicyCheck {
  const violations: string[] = [];

  // Check leverage
  if (decision.leverage > policies.maxLeverage) {
    violations.push(`Leverage ${decision.leverage}x exceeds max ${policies.maxLeverage}x`);
  }

  // Check position size
  if (decision.sizeUsd > policies.maxPositionSizeUsd) {
    violations.push(`Size $${decision.sizeUsd} exceeds max $${policies.maxPositionSizeUsd}`);
  }

  // Check approved pairs
  if (!policies.approvedPairs.includes(decision.symbol)) {
    violations.push(`${decision.symbol} not in approved pairs`);
  }

  // Check drawdown
  const currentDrawdown = calculateDrawdown(agentId);
  if (currentDrawdown > policies.maxDrawdownPct) {
    violations.push(`Current drawdown ${currentDrawdown}% exceeds max ${policies.maxDrawdownPct}%`);
  }

  return {
    passed: violations.length === 0,
    violations
  };
}
```

### Credits & Monetization

Agentiom uses a **credit-based** monetization model (no token gating required). Users purchase credits via traditional payment methods (Stripe) or crypto, and credits are consumed as agents operate.

```typescript
interface CreditTransaction {
  id: string;
  userId: string;
  agentId?: string;
  amount: number;                 // Positive = purchase, negative = usage
  type: 'purchase' | 'analysis' | 'execution' | 'chat' | 'bonus' | 'subscription';
  description: string;
  balanceAfter: number;
  createdAt: Date;
}

// Credit costs per operation
const CREDIT_COSTS = {
  // Analysis costs vary by LLM provider
  analysis: {
    claude: 3,      // Claude Sonnet 4
    gpt4: 3,        // GPT-4.1
    gemini: 1,      // Gemini Flash
    deepseek: 1,    // DeepSeek
    grok: 2         // xAI Grok
  },
  // Per-task execution costs
  taskExecution: 1,         // Each successful task execution
  stepEvaluation: 0,        // Free - conditions are evaluated locally
  // Chat costs
  chat: 1,                  // Per chat message with agent
  // Market analysis
  marketAnalysis: 2,        // On-demand technical analysis
  sentimentAnalysis: 3      // Social sentiment analysis
};

// Subscription tiers (monthly)
const SUBSCRIPTION_TIERS = {
  free: {
    price: 0,
    credits: 100,           // 100 free credits/month
    agents: 1,              // 1 active agent
    tasks: 5,               // 5 tasks per agent
    executionInterval: 300, // 5 min minimum between cycles
    features: ['basic_analysis', 'chat']
  },
  pro: {
    price: 49,              // $49/month
    credits: 1000,          // 1,000 credits included
    agents: 5,              // 5 agents
    tasks: 20,              // 20 tasks per agent
    executionInterval: 60,  // 1 min minimum
    features: ['advanced_analysis', 'chat', 'custom_data', 'priority_execution']
  },
  unlimited: {
    price: 149,             // $149/month
    credits: -1,            // Unlimited
    agents: -1,             // Unlimited
    tasks: -1,              // Unlimited
    executionInterval: 30,  // 30 sec minimum
    features: ['all', 'api_access', 'white_label']
  }
};
```

**Credit Purchase Pricing:**
```
100 credits   = $5    ($0.05/credit)
500 credits   = $20   ($0.04/credit)  - 20% savings
1000 credits  = $35   ($0.035/credit) - 30% savings
5000 credits  = $150  ($0.03/credit)  - 40% savings
```

**Example Monthly Usage:**
- Free tier user: 100 credits = ~33 analysis cycles (using Gemini) + some chat
- Pro user trading BTC with Claude: 1,000 credits = ~333 analysis cycles = continuous 5-min cycles for ~28 hours
- Pro user with Gemini: 1,000 credits = ~1,000 analysis cycles = continuous 5-min cycles for ~83 hours

---

## Part 2: Agent Execution Loop

### Task-Based Execution Architecture

Unlike continuous polling loops, Agentiom uses **task-based execution** where agents iterate through defined tasks and validate each step sequentially before execution. This approach is more efficient (fewer API calls), more transparent (clear decision trails), and more aligned with how traders actually think.

```typescript
interface TaskExecutionResult {
  taskId: string;
  status: 'executed' | 'conditions_not_met' | 'skipped' | 'error';
  stepsCompleted: number;
  failedAtStep?: number;
  failureReason?: string;
  executionResult?: {
    orderId: string;
    filledSize: number;
    avgPrice: number;
  };
  creditsUsed: number;
}

async function agentExecutionLoop(agentId: string) {
  const agent = await getAgent(agentId);

  while (agent.status === 'active') {
    try {
      // 1. Check credits before any work
      const credits = await getUserCredits(agent.userId);
      const minCreditsRequired = CREDIT_COSTS.analysis[agent.llmProvider];

      if (credits < minCreditsRequired) {
        await logEvent(agentId, 'paused', 'Insufficient credits');
        await notifyUser(agent.userId, 'Agent paused: insufficient credits');
        await sleep(60000);
        continue;
      }

      // 2. Fetch market data (single call for all approved pairs)
      const marketData = await fetchMarketData(agent.policies.approvedPairs);

      // 3. Get current positions from Hyperliquid
      const positions = await hyperliquid.getPositions(agent.walletAddress);

      // 4. Get active tasks sorted by priority
      const tasks = await getActiveTasks(agentId);

      // 5. Check for applicable adaptations (learned behaviors)
      const adaptations = await getActiveAdaptations(agentId);
      const globalModifiers = evaluateGlobalAdaptations(adaptations, marketData, positions);

      // If a global adaptation says "skip all trading", respect it
      if (globalModifiers.skipAllTrades) {
        await logEvent(agentId, 'adaptation', globalModifiers.skipReason);
        await sleep(agent.executionIntervalSeconds * 1000);
        continue;
      }

      // 6. Iterate through tasks by priority
      for (const task of tasks) {
        const result = await executeTask(agent, task, marketData, positions, adaptations);

        await logTaskResult(agentId, task.id, result);

        // If a task executed successfully, break to avoid over-trading
        if (result.status === 'executed') {
          await updateTaskStats(task.id, 'success');
          break;
        }

        // Track failed conditions for learning
        if (result.status === 'conditions_not_met') {
          await updateTaskStats(task.id, 'conditions_not_met', result.failedAtStep);
        }
      }

      // 7. Deduct credits for this analysis cycle
      await deductCredits(agent.userId, 'analysis', CREDIT_COSTS.analysis[agent.llmProvider]);

      // 8. Sleep until next execution cycle
      await sleep(agent.executionIntervalSeconds * 1000);

    } catch (error) {
      await logEvent(agentId, 'error', error.message);
      await sleep(30000);
    }
  }
}
```

### Task Execution Engine

Each task is executed step-by-step, validating conditions sequentially:

```typescript
async function executeTask(
  agent: Agent,
  task: Task,
  marketData: Record<string, MarketData>,
  positions: Position[],
  adaptations: Adaptation[]
): Promise<TaskExecutionResult> {

  const creditsUsed = 0;

  // Iterate through steps in order
  for (const step of task.steps.sort((a, b) => a.order - b.order)) {

    // Evaluate step condition
    const conditionResult = await evaluateCondition(
      step.condition,
      marketData,
      positions,
      agent
    );

    // Log step evaluation
    await logStepEvaluation(agent.id, task.id, step.id, conditionResult);

    // If condition fails, task cannot proceed
    if (!conditionResult.passed) {
      return {
        taskId: task.id,
        status: 'conditions_not_met',
        stepsCompleted: step.order - 1,
        failedAtStep: step.order,
        failureReason: conditionResult.reason,
        creditsUsed
      };
    }

    // If this is the final step with an action, execute it
    if (step.action && step.order === task.steps.length) {

      // Apply any relevant adaptations to modify the action
      const modifiedAction = applyAdaptations(step.action, adaptations, marketData);

      // Validate against policies before execution
      const policyCheck = validateAction(modifiedAction, agent.policies);
      if (!policyCheck.passed) {
        return {
          taskId: task.id,
          status: 'error',
          stepsCompleted: step.order,
          failureReason: `Policy violation: ${policyCheck.violations.join(', ')}`,
          creditsUsed
        };
      }

      // Execute the trade
      const executionResult = await executeTrade(agent, modifiedAction, marketData);

      return {
        taskId: task.id,
        status: 'executed',
        stepsCompleted: step.order,
        executionResult,
        creditsUsed: creditsUsed + CREDIT_COSTS.execution
      };
    }
  }

  // All conditions passed but no action defined
  return {
    taskId: task.id,
    status: 'conditions_not_met',
    stepsCompleted: task.steps.length,
    failureReason: 'No action defined',
    creditsUsed
  };
}
```

### Condition Evaluator

Evaluates task step conditions against current market state:

```typescript
interface ConditionResult {
  passed: boolean;
  reason: string;
  actualValue?: number;
  targetValue?: number | [number, number];
}

async function evaluateCondition(
  condition: TaskStep['condition'],
  marketData: Record<string, MarketData>,
  positions: Position[],
  agent: Agent
): Promise<ConditionResult> {

  const symbol = agent.policies.approvedPairs[0]; // Primary trading pair
  const data = marketData[symbol];

  switch (condition.type) {
    case 'indicator':
      return evaluateIndicatorCondition(condition, data);

    case 'price':
      return evaluatePriceCondition(condition, data);

    case 'position':
      return evaluatePositionCondition(condition, positions, symbol);

    case 'time':
      return evaluateTimeCondition(condition);

    case 'custom':
      return evaluateCustomCondition(condition, data, positions);

    default:
      return { passed: false, reason: 'Unknown condition type' };
  }
}

function evaluateIndicatorCondition(
  condition: TaskStep['condition'],
  data: MarketData
): ConditionResult {

  const indicatorValue = getIndicatorValue(condition.indicator!, data);

  if (indicatorValue === null) {
    return { passed: false, reason: `Indicator ${condition.indicator} not available` };
  }

  const targetValue = condition.value;
  let passed = false;

  switch (condition.operator) {
    case '<':
      passed = indicatorValue < (targetValue as number);
      break;
    case '>':
      passed = indicatorValue > (targetValue as number);
      break;
    case '==':
      passed = Math.abs(indicatorValue - (targetValue as number)) < 0.01;
      break;
    case 'between':
      const [min, max] = targetValue as [number, number];
      passed = indicatorValue >= min && indicatorValue <= max;
      break;
    case 'crosses_above':
      passed = checkCrossover(condition.indicator!, targetValue as number, data, 'above');
      break;
    case 'crosses_below':
      passed = checkCrossover(condition.indicator!, targetValue as number, data, 'below');
      break;
  }

  return {
    passed,
    reason: passed
      ? `${condition.indicator} = ${indicatorValue.toFixed(2)} meets condition`
      : `${condition.indicator} = ${indicatorValue.toFixed(2)} does not meet ${condition.operator} ${targetValue}`,
    actualValue: indicatorValue,
    targetValue
  };
}

function getIndicatorValue(indicator: string, data: MarketData): number | null {
  const indicators: Record<string, number | null> = {
    'RSI': data.rsi14,
    'RSI14': data.rsi14,
    'ADX': data.adx,
    'MACD': data.macd?.histogram,
    'MACD_HISTOGRAM': data.macd?.histogram,
    'MACD_SIGNAL': data.macd?.signal,
    'EMA20': data.ema20,
    'EMA50': data.ema50,
    'BB_UPPER': data.bollingerUpper,
    'BB_LOWER': data.bollingerLower,
    'BB_UPPER_DISTANCE': ((data.bollingerUpper - data.price) / data.price) * 100,
    'BB_LOWER_DISTANCE': ((data.price - data.bollingerLower) / data.price) * 100,
    'ATR': data.atr,
    'VOLUME': data.volume24h,
    'OI': data.openInterest,
    'FUNDING': data.fundingRate * 100, // Convert to percentage
  };

  return indicators[indicator.toUpperCase()] ?? null;
}
```

### Adaptation Application

Adaptations modify trading behavior based on learned patterns:

```typescript
interface ActionModification {
  originalAction: TaskStep['action'];
  modifiedAction: TaskStep['action'];
  appliedAdaptations: string[];
  skipTrade: boolean;
  skipReason?: string;
}

function applyAdaptations(
  action: TaskStep['action'],
  adaptations: Adaptation[],
  marketData: Record<string, MarketData>
): TaskStep['action'] {

  let modifiedAction = { ...action };
  const appliedAdaptations: string[] = [];

  for (const adaptation of adaptations.filter(a => a.status === 'active')) {
    const shouldApply = evaluateAdaptationTrigger(adaptation.trigger, marketData);

    if (shouldApply) {
      switch (adaptation.modification.type) {
        case 'reduce_size':
          modifiedAction.sizePercent = (modifiedAction.sizePercent || 0) * (adaptation.modification.factor || 0.5);
          appliedAdaptations.push(`${adaptation.name}: reduced size by ${((1 - (adaptation.modification.factor || 0.5)) * 100).toFixed(0)}%`);
          break;

        case 'widen_stops':
          if (modifiedAction.stopLossPercent) {
            modifiedAction.stopLossPercent *= (adaptation.modification.factor || 1.5);
            appliedAdaptations.push(`${adaptation.name}: widened stop loss`);
          }
          break;

        case 'increase_confirmation':
          // This would be handled at the task level, not action level
          break;

        case 'skip_trade':
          // Return null to signal trade should be skipped
          return null as any;
      }
    }
  }

  return modifiedAction;
}
```

### Market Data Fetching

```typescript
interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  nextFundingTime: number;

  // Technical indicators
  rsi14: number;
  macd: { macd: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;

  // Orderbook
  bidPrice: number;
  askPrice: number;
  spread: number;

  // Liquidation data
  longLiquidations24h: number;
  shortLiquidations24h: number;
}

async function fetchMarketData(symbols: string[]): Promise<Record<string, MarketData>> {
  const [prices, funding, indicators] = await Promise.all([
    hyperliquid.getMetaAndAssetCtxs(),
    hyperliquid.getPredictedFundings(),
    calculateIndicators(symbols)
  ]);

  return symbols.reduce((acc, symbol) => {
    acc[symbol] = {
      symbol,
      price: prices[symbol].markPx,
      change24h: prices[symbol].dayNtlVlm,
      volume24h: prices[symbol].dayNtlVlm,
      openInterest: prices[symbol].openInterest,
      fundingRate: funding[symbol]?.fundingRate || 0,
      ...indicators[symbol]
    };
    return acc;
  }, {});
}
```

### AI Decision System

```typescript
interface Decision {
  action: 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE' | 'ADD' | 'REDUCE' | 'NO_ACTION';
  symbol: string;
  confidence: number;             // 0-100
  sizeUsd: number;
  leverage: number;
  takeProfit?: number;
  stopLoss?: number;
  reasoning: string;
  marketContext: string;
}

async function getAIDecision(context: AgentContext, agent: Agent): Promise<Decision> {
  const prompt = buildDecisionPrompt(context, agent);

  const response = await callLLM(agent.llmProvider, {
    system: AGENT_SYSTEM_PROMPT,
    user: prompt,
    responseFormat: 'json'
  });

  return parseDecisionResponse(response);
}

const AGENT_SYSTEM_PROMPT = `You are an autonomous trading agent on Hyperliquid perpetual futures.

Your role is to analyze market conditions and make trading decisions based on your defined strategy and goals. You must always respect the risk policies provided.

You will receive:
1. Your personality and strategy definition
2. Current market data (price, funding, OI, technicals)
3. Your current positions
4. Your risk policies

You must respond with a JSON decision:
{
  "action": "OPEN_LONG" | "OPEN_SHORT" | "CLOSE" | "ADD" | "REDUCE" | "NO_ACTION",
  "symbol": "BTC" | "ETH" | etc,
  "confidence": 0-100,
  "sizeUsd": number,
  "leverage": number,
  "takeProfit": number | null,
  "stopLoss": number | null,
  "reasoning": "Your detailed analysis and reasoning",
  "marketContext": "Brief summary of current market conditions"
}

IMPORTANT:
- Never exceed policy limits
- Always provide clear reasoning
- Consider funding rates for position costs
- Factor in current positions before adding exposure
- NO_ACTION is valid when conditions don't meet your strategy`;

function buildDecisionPrompt(context: AgentContext, agent: Agent): string {
  return `
## Your Identity
${agent.personality}

## Your Strategy
${agent.strategy}

## Your Goals
${agent.goals.map(g => `- ${g.description}`).join('\n')}

## Current Market Data for ${context.symbol}
- Price: $${context.marketData.price}
- 24h Change: ${context.marketData.change24h}%
- RSI(14): ${context.marketData.rsi14}
- MACD: ${context.marketData.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
- Funding Rate: ${(context.marketData.fundingRate * 100).toFixed(4)}%
- Open Interest: $${formatNumber(context.marketData.openInterest)}
- 24h Volume: $${formatNumber(context.marketData.volume24h)}

## Your Current Position
${context.currentPosition ? `
- Side: ${context.currentPosition.side}
- Size: $${context.currentPosition.sizeUsd}
- Entry: $${context.currentPosition.entryPrice}
- Unrealized PnL: $${context.currentPosition.unrealizedPnl}
- Leverage: ${context.currentPosition.leverage}x
` : 'No open position'}

## Risk Policies
- Max Leverage: ${agent.policies.maxLeverage}x
- Max Position Size: $${agent.policies.maxPositionSizeUsd}
- Max Drawdown: ${agent.policies.maxDrawdownPct}%
- Approved Pairs: ${agent.policies.approvedPairs.join(', ')}

## Account Status
- Balance: $${context.accountBalance}
- Current Drawdown: ${context.currentDrawdown}%

Analyze the market and provide your decision.`;
}
```

---

## Part 3: Agent Genome System

### Genome Structure

```typescript
interface AgentGenome {
  id: string;
  version: number;

  // Reasoning parameters
  reasoning: {
    analysisDepth: 'shallow' | 'moderate' | 'deep';
    riskTolerance: number;        // 0-100
    confirmationBias: number;     // How much to weight confirming signals
    contrarian: number;           // Tendency to go against crowd
  };

  // Signal weights
  signals: {
    technical: number;
    funding: number;
    sentiment: number;
    volume: number;
    openInterest: number;
  };

  // Behavioral traits
  behavior: {
    patientEntry: boolean;        // Wait for confirmation
    quickExit: boolean;           // Cut losses fast
    pyramiding: boolean;          // Add to winners
    scaleOut: boolean;            // Partial profit taking
  };

  // Performance history
  performance: {
    totalTrades: number;
    winRate: number;
    avgPnlPct: number;
    sharpeRatio: number;
    maxDrawdown: number;
    profitFactor: number;
  };

  // Evolution metadata
  parentGenome?: string;
  mutations: string[];
  createdAt: Date;
}
```

### Evolutionary Improvement

```typescript
async function evolveGenome(genomeId: string): Promise<AgentGenome> {
  const genome = await getGenome(genomeId);
  const performance = await calculateGenomePerformance(genomeId);

  // Identify weaknesses
  const weaknesses = identifyWeaknesses(performance);

  // Generate mutations
  const mutations: string[] = [];

  if (weaknesses.includes('low_win_rate')) {
    genome.reasoning.confirmationBias += 0.1;
    genome.behavior.patientEntry = true;
    mutations.push('increased_confirmation_bias');
  }

  if (weaknesses.includes('large_losses')) {
    genome.behavior.quickExit = true;
    genome.reasoning.riskTolerance -= 10;
    mutations.push('reduced_risk_tolerance');
  }

  if (weaknesses.includes('missed_opportunities')) {
    genome.reasoning.analysisDepth = 'shallow';
    genome.reasoning.contrarian += 0.1;
    mutations.push('faster_decision_making');
  }

  // Create evolved genome
  const evolvedGenome: AgentGenome = {
    ...genome,
    id: generateId(),
    version: genome.version + 1,
    parentGenome: genomeId,
    mutations,
    performance: { ...genome.performance },  // Reset for new version
    createdAt: new Date()
  };

  return evolvedGenome;
}
```

---

## Part 4: Database Schema

### PostgreSQL (Supabase)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT,
  credits INTEGER DEFAULT 100,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Wallet
  wallet_address TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,

  -- Strategy
  personality TEXT NOT NULL,
  strategy TEXT NOT NULL,

  -- Policies (JSONB)
  policies JSONB NOT NULL DEFAULT '{
    "maxLeverage": 10,
    "maxPositionSizeUsd": 1000,
    "maxPositionSizePct": 10,
    "maxDrawdownPct": 20,
    "approvedPairs": ["BTC", "ETH"]
  }',

  -- Configuration
  llm_provider TEXT DEFAULT 'claude',
  execution_interval_seconds INTEGER DEFAULT 300,
  data_weights JSONB DEFAULT '{}',

  -- State
  status TEXT DEFAULT 'paused',
  genome_id UUID REFERENCES agent_genomes(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Genomes
CREATE TABLE agent_genomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  reasoning JSONB NOT NULL,
  signals JSONB NOT NULL,
  behavior JSONB NOT NULL,
  performance JSONB DEFAULT '{}',
  parent_genome_id UUID REFERENCES agent_genomes(id),
  mutations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (step-based execution)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5,            -- 1-10, higher = checked first
  status TEXT DEFAULT 'active',          -- 'active', 'paused'

  -- Performance tracking
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  avg_credits_per_run NUMERIC DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Steps (sequential conditions)
CREATE TABLE task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,           -- 1, 2, 3...
  name TEXT NOT NULL,                    -- "VALIDATE RANGING CONDITIONS"
  description TEXT,

  -- Condition to evaluate
  condition JSONB NOT NULL,              -- { type, indicator, operator, value, timeframe }

  -- Action to execute (only on final step)
  action JSONB,                          -- { type, sizePercent, leverage, tp, sl }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Adaptations (learned behaviors)
CREATE TABLE adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "High Volatility Caution"
  description TEXT,
  status TEXT DEFAULT 'active',          -- 'active', 'paused', 'disabled'

  -- Confidence and performance
  confidence INTEGER DEFAULT 50,         -- 0-100%
  success_rate NUMERIC DEFAULT 0,
  total_applications INTEGER DEFAULT 0,

  -- What triggers this adaptation
  trigger_type TEXT NOT NULL,            -- 'time', 'volatility', 'drawdown', 'streak', 'indicator'
  trigger_condition TEXT NOT NULL,       -- Natural language or structured condition

  -- What the adaptation does
  modification_type TEXT NOT NULL,       -- 'skip_trade', 'reduce_size', 'increase_confirmation', 'widen_stops'
  modification_factor NUMERIC,           -- e.g., 0.5 for 50% size reduction

  -- How it was learned
  learned_from TEXT,                     -- "3 consecutive losses on Monday opens"
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Version History (configuration snapshots)
CREATE TABLE agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,                 -- "1.0.0", "1.1.0", etc.
  version_type TEXT NOT NULL,            -- 'major', 'minor', 'patch'
  description TEXT,                      -- "Added RSI confirmation step"

  -- Snapshot of agent state at this version
  personality_snapshot TEXT,
  strategy_snapshot TEXT,
  policies_snapshot JSONB,
  task_count INTEGER DEFAULT 0,
  adaptation_count INTEGER DEFAULT 0,

  -- Full config backup
  full_config JSONB,                     -- Complete agent configuration

  -- Performance at this version
  performance_snapshot JSONB,            -- { winRate, pnl, sharpe, etc. }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions (cached from Hyperliquid)
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  size NUMERIC NOT NULL,
  size_usd NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  mark_price NUMERIC,
  liquidation_price NUMERIC,
  leverage NUMERIC NOT NULL,
  unrealized_pnl NUMERIC,
  realized_pnl NUMERIC DEFAULT 0,
  take_profit NUMERIC,
  stop_loss NUMERIC,
  status TEXT DEFAULT 'open',
  entry_reasoning TEXT,
  exit_reasoning TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  UNIQUE(agent_id, symbol, status) WHERE status = 'open'
);

-- Agent Logs
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,           -- 'thinking', 'decision', 'execution', 'error', 'policy'
  symbol TEXT,
  content TEXT NOT NULL,
  decision JSONB,
  confidence INTEGER,
  market_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,               -- 'purchase', 'analysis', 'execution', 'chat', 'bonus'
  description TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitions (Arena)
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL,               -- 'human_vs_machine', 'machine_vs_machine', 'free_for_all'
  entry_fee NUMERIC DEFAULT 0,
  prize_pool NUMERIC DEFAULT 0,
  max_participants INTEGER,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming',   -- 'upcoming', 'active', 'completed'
  rules JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competition Entries
CREATE TABLE competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  user_id UUID REFERENCES users(id),
  starting_balance NUMERIC NOT NULL,
  current_balance NUMERIC,
  pnl NUMERIC DEFAULT 0,
  pnl_pct NUMERIC DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(competition_id, agent_id)
);

-- Indexes
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_positions_agent ON positions(agent_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_logs_agent ON agent_logs(agent_id);
CREATE INDEX idx_logs_created ON agent_logs(created_at DESC);
CREATE INDEX idx_credits_user ON credit_transactions(user_id);

-- Task indexes
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_priority ON tasks(agent_id, priority DESC);
CREATE INDEX idx_task_steps_task ON task_steps(task_id);
CREATE INDEX idx_task_steps_order ON task_steps(task_id, step_order);

-- Adaptation indexes
CREATE INDEX idx_adaptations_agent ON adaptations(agent_id);
CREATE INDEX idx_adaptations_status ON adaptations(agent_id, status);

-- Version history indexes
CREATE INDEX idx_versions_agent ON agent_versions(agent_id);
CREATE INDEX idx_versions_created ON agent_versions(agent_id, created_at DESC);
```

---

## Part 5: API Endpoints

### Authentication

```
POST /api/auth/connect          # Connect wallet (SIWE)
POST /api/auth/verify           # Verify signature
POST /api/auth/logout           # Clear session
GET  /api/auth/me               # Get current user
```

### Agents

```
GET    /api/agents              # List user's agents
POST   /api/agents              # Create new agent
GET    /api/agents/:id          # Get agent details
PATCH  /api/agents/:id          # Update agent
DELETE /api/agents/:id          # Delete agent

POST   /api/agents/:id/start    # Start agent
POST   /api/agents/:id/pause    # Pause agent
POST   /api/agents/:id/stop     # Stop agent

GET    /api/agents/:id/positions    # Get positions
GET    /api/agents/:id/logs         # Get decision logs
GET    /api/agents/:id/performance  # Get performance metrics
POST   /api/agents/:id/chat         # Chat with agent
```

### Tasks

```
GET    /api/agents/:id/tasks              # List agent tasks
POST   /api/agents/:id/tasks              # Create new task
GET    /api/agents/:id/tasks/:taskId      # Get task details with steps
PATCH  /api/agents/:id/tasks/:taskId      # Update task
DELETE /api/agents/:id/tasks/:taskId      # Delete task
POST   /api/agents/:id/tasks/:taskId/pause    # Pause task
POST   /api/agents/:id/tasks/:taskId/resume   # Resume task

# Task Steps
POST   /api/agents/:id/tasks/:taskId/steps       # Add step to task
PATCH  /api/agents/:id/tasks/:taskId/steps/:stepId   # Update step
DELETE /api/agents/:id/tasks/:taskId/steps/:stepId   # Delete step
POST   /api/agents/:id/tasks/:taskId/steps/reorder   # Reorder steps
```

### Adaptations

```
GET    /api/agents/:id/adaptations            # List learned adaptations
GET    /api/agents/:id/adaptations/:adaptId   # Get adaptation details
PATCH  /api/agents/:id/adaptations/:adaptId   # Update adaptation (toggle status)
DELETE /api/agents/:id/adaptations/:adaptId   # Delete adaptation
POST   /api/agents/:id/adaptations/suggest    # AI-suggest adaptations based on performance
```

### Version History

```
GET    /api/agents/:id/versions           # List version history
GET    /api/agents/:id/versions/:versionId    # Get specific version snapshot
POST   /api/agents/:id/versions           # Create manual version snapshot
POST   /api/agents/:id/versions/:versionId/restore   # Restore to previous version
```

### Trading

```
POST /api/agents/:id/deposit    # Deposit to agent wallet
POST /api/agents/:id/withdraw   # Withdraw from agent wallet
POST /api/agents/:id/close      # Force close position
POST /api/agents/:id/adjust     # Manual position adjustment
```

### Marketplace

```
GET  /api/marketplace/agents    # Browse public agents
GET  /api/marketplace/leaderboard   # Top performers
POST /api/marketplace/clone/:id     # Clone an agent
```

### Arena

```
GET  /api/arena/competitions        # List competitions
GET  /api/arena/competitions/:id    # Competition details
POST /api/arena/competitions/:id/enter  # Enter competition
GET  /api/arena/competitions/:id/leaderboard  # Live rankings
WS   /api/arena/competitions/:id/stream     # Real-time PnL
```

### Credits

```
GET  /api/credits               # Get balance
POST /api/credits/purchase      # Buy credits
GET  /api/credits/history       # Transaction history
```

---

## Part 6: Hyperliquid Integration

### Core API Calls

```typescript
// Get user state
const state = await hyperliquid.info.clearinghouseState(walletAddress);
// Returns: positions, balances, margin info

// Get market data
const markets = await hyperliquid.info.metaAndAssetCtxs();
// Returns: all perpetual markets with prices, OI, volume

// Get funding rates
const funding = await hyperliquid.info.predictedFundings();
// Returns: predicted funding for all pairs

// Place order
const result = await hyperliquid.exchange.order({
  coin: 'BTC',
  is_buy: true,
  sz: 0.01,
  limit_px: 100000,
  order_type: { limit: { tif: 'Gtc' } },
  reduce_only: false
});

// Close position
const close = await hyperliquid.exchange.order({
  coin: 'BTC',
  is_buy: false,  // Opposite side
  sz: currentSize,
  limit_px: 0,    // Market order
  order_type: { limit: { tif: 'Ioc' } },
  reduce_only: true
});

// Set TP/SL
await hyperliquid.exchange.order({
  coin: 'BTC',
  is_buy: false,
  sz: currentSize,
  limit_px: takeProfitPrice,
  order_type: { trigger: { triggerPx: takeProfitPrice, isMarket: true, tpsl: 'tp' } },
  reduce_only: true
});
```

### WebSocket Feeds

```typescript
// Real-time price updates
hyperliquid.subscribe({
  type: 'allMids'
}, (data) => {
  // Update cached prices
});

// User fills (trade confirmations)
hyperliquid.subscribe({
  type: 'userFills',
  user: walletAddress
}, (fill) => {
  // Log execution, update position
});

// Order updates
hyperliquid.subscribe({
  type: 'orderUpdates',
  user: walletAddress
}, (update) => {
  // Track order status
});
```

---

## Part 7: Security Implementation

### Wallet Security

```typescript
// API key encryption
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes

function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptApiKey(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Rate Limiting

```typescript
const rateLimiter = {
  agents: new Map<string, { count: number; resetAt: number }>(),

  check(agentId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.agents.get(agentId);

    if (!record || now > record.resetAt) {
      this.agents.set(agentId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count++;
    return true;
  }
};

// Usage: Max 10 trades per minute per agent
if (!rateLimiter.check(agentId, 10, 60000)) {
  throw new Error('Rate limit exceeded');
}
```

### Decision Validation

```typescript
function validateAIOutput(output: any): Decision {
  // Schema validation
  const schema = z.object({
    action: z.enum(['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'ADD', 'REDUCE', 'NO_ACTION']),
    symbol: z.string(),
    confidence: z.number().min(0).max(100),
    sizeUsd: z.number().min(0),
    leverage: z.number().min(1).max(50),
    takeProfit: z.number().optional(),
    stopLoss: z.number().optional(),
    reasoning: z.string(),
    marketContext: z.string()
  });

  const parsed = schema.safeParse(output);
  if (!parsed.success) {
    throw new Error(`Invalid AI output: ${parsed.error.message}`);
  }

  // Sanity checks
  if (parsed.data.sizeUsd > 1000000) {
    throw new Error('Unreasonable position size');
  }

  if (parsed.data.takeProfit && parsed.data.stopLoss) {
    if (parsed.data.action === 'OPEN_LONG' && parsed.data.takeProfit < parsed.data.stopLoss) {
      throw new Error('TP below SL for long position');
    }
  }

  return parsed.data;
}
```

---

## Part 8: Infrastructure

### Tech Stack

```
Frontend:        Next.js 14 (App Router) + React + TailwindCSS
Backend:         Python FastAPI (Hyperliquid SDK) + Node.js (real-time)
Database:        Supabase (PostgreSQL + Realtime + Auth)
Cache:           Redis (Vercel KV)
Queue:           BullMQ (agent execution jobs)
AI:              Anthropic Claude, OpenAI GPT-4, Google Gemini
Hosting:         Vercel (frontend), Railway (backend services)
Monitoring:      Sentry, Datadog
```

### Cost Estimates (Monthly)

```
Vercel Pro:               $20
Supabase Pro:             $25
Railway (2 services):     $40
Redis (Upstash):          $10
AI APIs:                  $200-500 (usage-based)
Domain:                   $1
Monitoring:               $20
---------------------------------
Total:                    ~$320-600/month

Break-even: ~10 Pro subscribers ($49/mo)
```

---

## Part 9: Development Roadmap

### Phase 1: MVP (Weeks 1-4)

- [ ] User authentication (wallet connect)
- [ ] Basic agent creation flow
- [ ] Single agent execution loop
- [ ] Hyperliquid integration (positions, orders)
- [ ] Simple chat interface
- [ ] Position management UI

### Phase 2: Core Features (Weeks 5-8)

- [ ] Multiple LLM providers
- [ ] Advanced policy configuration
- [ ] Agent logs and transparency
- [ ] Performance metrics and charts
- [ ] Credits system
- [ ] Multiple agents per user

### Phase 3: Marketplace (Weeks 9-12)

- [ ] Public agent profiles
- [ ] Agent leaderboard
- [ ] Strategy cloning
- [ ] Subscription tiers
- [ ] Payment integration

### Phase 4: Arena (Weeks 13-16)

- [ ] Competition creation
- [ ] Live PnL streaming
- [ ] Leaderboards
- [ ] Prize distribution
- [ ] Historical archives

### Phase 5: Advanced (Weeks 17+)

- [ ] Genome evolution system
- [ ] Custom data sources (MCP)
- [ ] Mobile app
- [ ] Token launch
- [ ] Multi-chain expansion

---

## Appendix: Sample Prompts

### Strategy Definition Examples

**Momentum Trader:**
```
You are an aggressive momentum trader. You identify strong trends using RSI and MACD crossovers. Enter positions when momentum confirms direction. Use tight stops (2%) and let winners run (5-10% targets). Trade BTC and ETH only. Avoid choppy, ranging markets.
```

**Mean Reversion:**
```
You are a patient mean reversion trader. Look for oversold (RSI < 30) or overbought (RSI > 70) conditions. Enter counter-trend positions with modest leverage (3-5x). Target the 50 EMA as exit. Always use stops at recent swing highs/lows.
```

**Funding Rate Arbitrageur:**
```
You exploit funding rate extremes. When funding exceeds ±0.1%, position opposite to the crowd. If longs are paying high funding, go short. Hold until funding normalizes. Use low leverage (2-3x) as this is a slow strategy.
```
