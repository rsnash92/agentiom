// Core Types for Agentiom

// ============================================
// Agent Types
// ============================================

export type LLMProvider = 'claude' | 'gpt4' | 'gemini' | 'deepseek' | 'grok';
export type AgentStatus = 'active' | 'paused' | 'stopped';
export type DecisionAction = 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE' | 'ADD' | 'REDUCE' | 'NO_ACTION';
export type PositionSide = 'long' | 'short';
export type PositionStatus = 'open' | 'closed';

export interface TradingHours {
  start: number; // Hour in UTC (0-23)
  end: number;   // Hour in UTC (0-23)
}

export interface AgentPolicies {
  maxLeverage: number;          // 1-50
  maxPositionSizeUsd: number;
  maxPositionSizePct: number;   // % of account
  maxDrawdownPct: number;
  approvedPairs: string[];
  tradingHours?: TradingHours;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;

  // Wallet
  walletAddress: string;
  apiKeyEncrypted: string;

  // Strategy Definition
  personality: string;
  strategy: string;
  goals: Goal[];

  // Risk Policies
  policies: AgentPolicies;

  // Configuration
  llmProvider: LLMProvider;
  executionIntervalSeconds: number;
  dataWeights: Record<string, number>;

  // State
  status: AgentStatus;
  genomeId?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Goal Types
// ============================================

export interface Goal {
  id: string;
  agentId: string;
  description: string;
  priority: number;      // 1-10
  conditions: string;
  actions: string;
  isActive: boolean;
  createdAt: Date;
}

// ============================================
// Genome Types
// ============================================

export interface GenomeReasoning {
  analysisDepth: 'shallow' | 'moderate' | 'deep';
  riskTolerance: number;        // 0-100
  confirmationBias: number;
  contrarian: number;
}

export interface GenomeSignals {
  technical: number;
  funding: number;
  sentiment: number;
  volume: number;
  openInterest: number;
}

export interface GenomeBehavior {
  patientEntry: boolean;
  quickExit: boolean;
  pyramiding: boolean;
  scaleOut: boolean;
}

export interface GenomePerformance {
  totalTrades: number;
  winRate: number;
  avgPnlPct: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface AgentGenome {
  id: string;
  version: number;
  reasoning: GenomeReasoning;
  signals: GenomeSignals;
  behavior: GenomeBehavior;
  performance: GenomePerformance;
  parentGenomeId?: string;
  mutations: string[];
  createdAt: Date;
}

// ============================================
// Market Data Types
// ============================================

export interface MACD {
  macd: number;
  signal: number;
  histogram: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  nextFundingTime: number;

  // Technical indicators
  rsi14: number;
  macd: MACD;
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

// ============================================
// Decision Types
// ============================================

export interface Decision {
  action: DecisionAction;
  symbol: string;
  confidence: number;         // 0-100
  sizeUsd: number;
  leverage: number;
  takeProfit?: number;
  stopLoss?: number;
  reasoning: string;
  marketContext: string;
}

export interface PolicyCheck {
  passed: boolean;
  violations: string[];
  adjustedDecision?: Decision;
}

// ============================================
// Position Types
// ============================================

export interface Position {
  id: string;
  agentId: string;
  symbol: string;
  side: PositionSide;
  size: number;
  sizeUsd: number;
  entryPrice: number;
  markPrice?: number;
  liquidationPrice?: number;
  leverage: number;
  unrealizedPnl?: number;
  realizedPnl: number;
  takeProfit?: number;
  stopLoss?: number;
  status: PositionStatus;
  entryReasoning?: string;
  exitReasoning?: string;
  openedAt: Date;
  closedAt?: Date;
}

// ============================================
// Credit Types
// ============================================

export type CreditTransactionType = 'purchase' | 'analysis' | 'execution' | 'chat' | 'bonus';

export interface CreditTransaction {
  id: string;
  userId: string;
  agentId?: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}

export const CREDIT_COSTS = {
  analysis: {
    claude: 3,
    gpt4: 3,
    gemini: 1,
    deepseek: 1,
    grok: 2,
  },
  execution: 1,
  chat: 1,
} as const;

// ============================================
// User Types
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'unlimited';

export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  credits: number;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Competition Types
// ============================================

export type CompetitionMode = 'human_vs_machine' | 'machine_vs_machine' | 'free_for_all';
export type CompetitionStatus = 'upcoming' | 'active' | 'completed';

export interface Competition {
  id: string;
  name: string;
  description?: string;
  mode: CompetitionMode;
  entryFee: number;
  prizePool: number;
  maxParticipants?: number;
  startTime: Date;
  endTime: Date;
  status: CompetitionStatus;
  rules?: Record<string, unknown>;
  createdAt: Date;
}

export interface CompetitionEntry {
  id: string;
  competitionId: string;
  agentId?: string;
  userId: string;
  startingBalance: number;
  currentBalance?: number;
  pnl: number;
  pnlPct: number;
  rank?: number;
  joinedAt: Date;
}

// ============================================
// Agent Log Types
// ============================================

export type AgentLogType = 'thinking' | 'decision' | 'execution' | 'error' | 'policy';

export interface AgentLog {
  id: string;
  agentId: string;
  logType: AgentLogType;
  symbol?: string;
  content: string;
  decision?: Decision;
  confidence?: number;
  marketData?: MarketData;
  createdAt: Date;
}

// ============================================
// Agent Context for AI
// ============================================

export interface AgentContext {
  agent: Agent;
  symbol: string;
  marketData: MarketData;
  currentPosition?: Position;
  accountBalance: number;
  currentDrawdown: number;
}
