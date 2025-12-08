// ============================================
// Application Constants
// ============================================

/**
 * Credit costs for different operations
 */
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

/**
 * Subscription tier limits
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    creditsPerMonth: 100,
    maxAgents: 1,
    executionInterval: 300, // 5 minutes minimum
    features: ['basic_chat', 'single_agent'],
  },
  pro: {
    creditsPerMonth: 1000,
    maxAgents: 5,
    executionInterval: 60, // 1 minute minimum
    features: ['basic_chat', 'multi_agent', 'advanced_analysis', 'priority_support'],
  },
  unlimited: {
    creditsPerMonth: Infinity,
    maxAgents: Infinity,
    executionInterval: 30, // 30 seconds minimum
    features: ['basic_chat', 'multi_agent', 'advanced_analysis', 'priority_support', 'custom_data', 'api_access'],
  },
} as const;

/**
 * Default agent policies
 */
export const DEFAULT_POLICIES = {
  maxLeverage: 10,
  maxPositionSizeUsd: 1000,
  maxPositionSizePct: 10,
  maxDrawdownPct: 20,
  approvedPairs: ['BTC', 'ETH'],
} as const;

/**
 * Supported trading pairs on Hyperliquid with metadata
 */
export const MARKET_DATA = {
  BTC: { maxLeverage: 100, category: 'major' },
  ETH: { maxLeverage: 100, category: 'major' },
  SOL: { maxLeverage: 100, category: 'major' },
  DOGE: { maxLeverage: 50, category: 'major' },
  AVAX: { maxLeverage: 50, category: 'major' },
  MATIC: { maxLeverage: 50, category: 'major' },
  LINK: { maxLeverage: 50, category: 'major' },
  UNI: { maxLeverage: 20, category: 'defi' },
  LTC: { maxLeverage: 50, category: 'major' },
  ARB: { maxLeverage: 20, category: 'l2' },
  OP: { maxLeverage: 20, category: 'l2' },
  APT: { maxLeverage: 20, category: 'l1' },
  ATOM: { maxLeverage: 20, category: 'l1' },
  FTM: { maxLeverage: 20, category: 'l1' },
  NEAR: { maxLeverage: 20, category: 'l1' },
  INJ: { maxLeverage: 20, category: 'defi' },
  TIA: { maxLeverage: 20, category: 'l1' },
  SEI: { maxLeverage: 20, category: 'l1' },
  SUI: { maxLeverage: 20, category: 'l1' },
  BLUR: { maxLeverage: 10, category: 'nft' },
  PENGU: { maxLeverage: 20, category: 'meme' },
  WIF: { maxLeverage: 20, category: 'meme' },
  BONK: { maxLeverage: 10, category: 'meme' },
  PEPE: { maxLeverage: 20, category: 'meme' },
  FARTCOIN: { maxLeverage: 20, category: 'meme' },
  RAY: { maxLeverage: 10, category: 'defi' },
  FET: { maxLeverage: 10, category: 'ai' },
  BERA: { maxLeverage: 10, category: 'l1' },
  ENA: { maxLeverage: 10, category: 'defi' },
  MERL: { maxLeverage: 10, category: 'l2' },
  JUP: { maxLeverage: 20, category: 'defi' },
  ONDO: { maxLeverage: 10, category: 'rwa' },
  AAVE: { maxLeverage: 20, category: 'defi' },
  MKR: { maxLeverage: 10, category: 'defi' },
  RENDER: { maxLeverage: 10, category: 'ai' },
  TAO: { maxLeverage: 10, category: 'ai' },
} as const;

export const SUPPORTED_PAIRS = Object.keys(MARKET_DATA) as (keyof typeof MARKET_DATA)[];

export const MARKET_CATEGORIES = {
  all: 'All',
  major: 'Major',
  meme: 'Meme',
  defi: 'DeFi',
  l1: 'L1',
  l2: 'L2',
  ai: 'AI',
  rwa: 'RWA',
  nft: 'NFT',
} as const;

/**
 * LLM Provider display names and info
 */
export const LLM_PROVIDERS = {
  claude: {
    name: 'Claude Sonnet 4',
    description: 'Anthropic\'s latest model - excellent reasoning and analysis',
    creditCost: 3,
  },
  gpt4: {
    name: 'GPT-4 Turbo',
    description: 'OpenAI\'s flagship model - versatile and powerful',
    creditCost: 3,
  },
  gemini: {
    name: 'Gemini 1.5 Flash',
    description: 'Google\'s fast model - cost-effective',
    creditCost: 1,
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'Cost-effective reasoning model',
    creditCost: 1,
  },
  grok: {
    name: 'Grok',
    description: 'xAI\'s model - real-time information',
    creditCost: 2,
  },
} as const;

/**
 * Agent status display info
 */
export const AGENT_STATUS = {
  active: {
    label: 'Active',
    color: 'green',
    description: 'Agent is actively trading',
  },
  paused: {
    label: 'Paused',
    color: 'yellow',
    description: 'Agent is temporarily paused',
  },
  stopped: {
    label: 'Stopped',
    color: 'red',
    description: 'Agent is stopped and not trading',
  },
} as const;

/**
 * Technical analysis thresholds
 */
export const TA_THRESHOLDS = {
  rsi: {
    oversold: 30,
    overbought: 70,
    extreme_oversold: 20,
    extreme_overbought: 80,
  },
  funding: {
    high: 0.01, // 1%
    extreme: 0.05, // 5%
  },
} as const;

/**
 * API rate limits
 */
export const RATE_LIMITS = {
  agentExecutions: {
    limit: 10,
    windowMs: 60000, // 10 executions per minute
  },
  chat: {
    limit: 30,
    windowMs: 60000, // 30 messages per minute
  },
  api: {
    limit: 100,
    windowMs: 60000, // 100 requests per minute
  },
} as const;

/**
 * Hyperliquid API endpoints
 */
export const HYPERLIQUID_ENDPOINTS = {
  mainnet: {
    api: 'https://api.hyperliquid.xyz',
    ws: 'wss://api.hyperliquid.xyz/ws',
  },
  testnet: {
    api: 'https://api.hyperliquid-testnet.xyz',
    ws: 'wss://api.hyperliquid-testnet.xyz/ws',
  },
} as const;
