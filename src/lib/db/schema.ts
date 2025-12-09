import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Users
// ============================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: text('wallet_address').unique().notNull(),
  email: text('email'),
  credits: integer('credits').default(100).notNull(),
  subscriptionTier: text('subscription_tier').default('free').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_wallet_idx').on(table.walletAddress),
]);

export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
  creditTransactions: many(creditTransactions),
  competitionEntries: many(competitionEntries),
}));

// ============================================
// Agent Genomes
// ============================================

export const agentGenomes = pgTable('agent_genomes', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull(),
  reasoning: jsonb('reasoning').notNull().$type<{
    analysisDepth: 'shallow' | 'moderate' | 'deep';
    riskTolerance: number;
    confirmationBias: number;
    contrarian: number;
  }>(),
  signals: jsonb('signals').notNull().$type<{
    technical: number;
    funding: number;
    sentiment: number;
    volume: number;
    openInterest: number;
  }>(),
  behavior: jsonb('behavior').notNull().$type<{
    patientEntry: boolean;
    quickExit: boolean;
    pyramiding: boolean;
    scaleOut: boolean;
  }>(),
  performance: jsonb('performance').default({}).$type<{
    totalTrades: number;
    winRate: number;
    avgPnlPct: number;
    sharpeRatio: number;
    maxDrawdown: number;
    profitFactor: number;
  }>(),
  parentGenomeId: uuid('parent_genome_id'),
  mutations: text('mutations').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const agentGenomesRelations = relations(agentGenomes, ({ one, many }) => ({
  parentGenome: one(agentGenomes, {
    fields: [agentGenomes.parentGenomeId],
    references: [agentGenomes.id],
  }),
  agents: many(agents),
}));

// ============================================
// Agents
// ============================================

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),

  // Wallet
  walletAddress: text('wallet_address').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),

  // Strategy
  personality: text('personality').notNull(),
  strategy: text('strategy').notNull(),

  // Policies (JSONB)
  policies: jsonb('policies').notNull().$type<{
    maxLeverage: number;
    maxPositionSizeUsd: number;
    maxPositionSizePct: number;
    maxDrawdownPct: number;
    approvedPairs: string[];
    tradingHours?: { start: number; end: number };
  }>().default({
    maxLeverage: 10,
    maxPositionSizeUsd: 1000,
    maxPositionSizePct: 10,
    maxDrawdownPct: 20,
    approvedPairs: ['BTC', 'ETH'],
  }),

  // LLM Configuration
  llmConfig: jsonb('llm_config').default({
    primaryModel: 'claude-sonnet-4-20250514',
    simpleModel: 'gpt-4o-mini',
    analysisModel: 'deepseek-chat',
    autoSelect: true,
    parameters: {
      temperature: 0.3,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      maxTokens: 4096,
    },
  }).$type<{
    primaryModel: string;
    simpleModel: string;
    analysisModel: string;
    autoSelect: boolean;
    parameters: {
      temperature: number;
      topP: number;
      frequencyPenalty: number;
      presencePenalty: number;
      maxTokens: number;
    };
  }>().notNull(),

  // Execution Configuration
  executionInterval: integer('execution_interval').default(300).notNull(),
  dataWeights: jsonb('data_weights').default({}).$type<Record<string, number>>(),

  // State
  status: text('status').default('paused').notNull(),
  lastExecutionAt: timestamp('last_execution_at', { withTimezone: true }),
  genomeId: uuid('genome_id').references(() => agentGenomes.id),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('agents_user_idx').on(table.userId),
  index('agents_status_idx').on(table.status),
]);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  genome: one(agentGenomes, {
    fields: [agents.genomeId],
    references: [agentGenomes.id],
  }),
  goals: many(goals),
  positions: many(positions),
  logs: many(agentLogs),
  creditTransactions: many(creditTransactions),
}));

// ============================================
// Goals
// ============================================

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  priority: integer('priority').default(5).notNull(),
  conditions: text('conditions'),
  actions: text('actions'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ one }) => ({
  agent: one(agents, {
    fields: [goals.agentId],
    references: [agents.id],
  }),
}));

// ============================================
// Positions
// ============================================

export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(), // 'long' | 'short'
  size: numeric('size').notNull(),
  sizeUsd: numeric('size_usd').notNull(),
  entryPrice: numeric('entry_price').notNull(),
  markPrice: numeric('mark_price'),
  liquidationPrice: numeric('liquidation_price'),
  leverage: numeric('leverage').notNull(),
  unrealizedPnl: numeric('unrealized_pnl'),
  realizedPnl: numeric('realized_pnl').default('0'),
  takeProfit: numeric('take_profit'),
  stopLoss: numeric('stop_loss'),
  status: text('status').default('open').notNull(), // 'open' | 'closed'
  entryReasoning: text('entry_reasoning'),
  exitReasoning: text('exit_reasoning'),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (table) => [
  index('positions_agent_idx').on(table.agentId),
  index('positions_status_idx').on(table.status),
]);

export const positionsRelations = relations(positions, ({ one }) => ({
  agent: one(agents, {
    fields: [positions.agentId],
    references: [agents.id],
  }),
}));

// ============================================
// Agent Logs
// ============================================

export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  logType: text('log_type').notNull(), // 'thinking', 'decision', 'execution', 'error', 'policy'
  symbol: text('symbol'),
  content: text('content').notNull(),
  decision: jsonb('decision').$type<{
    action: string;
    symbol: string;
    confidence: number;
    sizeUsd: number;
    leverage: number;
    takeProfit?: number;
    stopLoss?: number;
    reasoning: string;
    marketContext: string;
  }>(),
  confidence: integer('confidence'),
  marketData: jsonb('market_data').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('logs_agent_idx').on(table.agentId),
  index('logs_created_idx').on(table.createdAt),
]);

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  agent: one(agents, {
    fields: [agentLogs.agentId],
    references: [agents.id],
  }),
}));

// ============================================
// Credit Transactions
// ============================================

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  amount: integer('amount').notNull(),
  type: text('type').notNull(), // 'purchase', 'analysis', 'execution', 'chat', 'bonus'
  description: text('description'),
  balanceAfter: integer('balance_after').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('credits_user_idx').on(table.userId),
]);

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [creditTransactions.agentId],
    references: [agents.id],
  }),
}));

// ============================================
// Competitions (Arena)
// ============================================

export const competitions = pgTable('competitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  mode: text('mode').notNull(), // 'human_vs_machine', 'machine_vs_machine', 'free_for_all'
  entryFee: numeric('entry_fee').default('0'),
  prizePool: numeric('prize_pool').default('0'),
  maxParticipants: integer('max_participants'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  status: text('status').default('upcoming').notNull(), // 'upcoming', 'active', 'completed'
  rules: jsonb('rules').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const competitionsRelations = relations(competitions, ({ many }) => ({
  entries: many(competitionEntries),
}));

// ============================================
// Competition Entries
// ============================================

export const competitionEntries = pgTable('competition_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  competitionId: uuid('competition_id').references(() => competitions.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  startingBalance: numeric('starting_balance').notNull(),
  currentBalance: numeric('current_balance'),
  pnl: numeric('pnl').default('0'),
  pnlPct: numeric('pnl_pct').default('0'),
  rank: integer('rank'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('competition_agent_idx').on(table.competitionId, table.agentId),
]);

export const competitionEntriesRelations = relations(competitionEntries, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionEntries.competitionId],
    references: [competitions.id],
  }),
  agent: one(agents, {
    fields: [competitionEntries.agentId],
    references: [agents.id],
  }),
  user: one(users, {
    fields: [competitionEntries.userId],
    references: [users.id],
  }),
}));

// ============================================
// LLM Usage Tracking
// ============================================

export const llmUsage = pgTable('llm_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  taskType: text('task_type').notNull(), // 'analysis', 'decision', 'management', 'risk'
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull(),
  latencyMs: integer('latency_ms').notNull(),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('llm_usage_agent_idx').on(table.agentId),
  index('llm_usage_user_idx').on(table.userId),
  index('llm_usage_created_idx').on(table.createdAt),
]);

export const llmUsageRelations = relations(llmUsage, ({ one }) => ({
  agent: one(agents, {
    fields: [llmUsage.agentId],
    references: [agents.id],
  }),
  user: one(users, {
    fields: [llmUsage.userId],
    references: [users.id],
  }),
}));

// ============================================
// Chat Messages
// ============================================

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  model: text('model'),
  tokens: integer('tokens'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('chat_agent_idx').on(table.agentId),
  index('chat_created_idx').on(table.createdAt),
]);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  agent: one(agents, {
    fields: [chatMessages.agentId],
    references: [agents.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
