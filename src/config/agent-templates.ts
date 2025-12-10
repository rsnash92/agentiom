/**
 * Pre-configured Agent Templates
 *
 * These templates help users get started quickly with proven trading strategies.
 * Each template includes pre-configured goals/tasks, triggers, and risk settings.
 */

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'momentum' | 'reversal' | 'trend' | 'scalping' | 'swing';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  // Pre-configured settings
  config: {
    strategy: string;
    personality: string;
    approvedPairs: string[];
    policies: {
      maxLeverage: number;
      maxPositionSizeUsd: number;
      maxPositionSizePct: number;
      maxDrawdownPct: number;
      positionSizing?: {
        strategy: 'fixed_fractional' | 'kelly_criterion' | 'volatility_adjusted' | 'risk_per_trade';
        maxRiskPerTrade?: number;
      };
      trailingStop?: {
        enabled: boolean;
        type: 'percentage' | 'atr' | 'step' | 'breakeven';
        trailPercent?: number;
        atrMultiplier?: number;
      };
    };
    llmConfig?: {
      primaryModel: string;
      temperature?: number;
    };
  };
  // Goals/Tasks that will be created
  goals: Array<{
    description: string;
    priority: number;
    conditions?: string;
    actions?: string;
  }>;
  // Display metadata
  stats: {
    tasks: number;
    triggers: number;
  };
  tags: string[];
  isOfficial: boolean;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // ==================== Momentum Strategies ====================
  {
    id: 'rsi-reversal',
    name: 'RSI Mean Reversion Scalper',
    description: 'Captures short-term reversals by identifying extreme RSI levels across multiple timeframes. Executes both long and short positions at oversold/overbought zones.',
    category: 'reversal',
    difficulty: 'beginner',
    config: {
      strategy: 'RSI Mean Reversion',
      personality: 'Patient and disciplined trader focused on statistical edges. Waits for extreme RSI readings before entering positions. Uses tight stops and quick profit targets.',
      approvedPairs: ['BTC', 'ETH', 'SOL'],
      policies: {
        maxLeverage: 5,
        maxPositionSizeUsd: 500,
        maxPositionSizePct: 5,
        maxDrawdownPct: 15,
        positionSizing: {
          strategy: 'fixed_fractional',
          maxRiskPerTrade: 2,
        },
        trailingStop: {
          enabled: true,
          type: 'percentage',
          trailPercent: 1.5,
        },
      },
    },
    goals: [
      {
        description: 'Open LONG when RSI(14) drops below 30 on 1H timeframe',
        priority: 1,
        conditions: 'RSI < 30, Price above 200 EMA',
        actions: 'Enter long with 2% risk, TP at RSI > 50',
      },
      {
        description: 'Open SHORT when RSI(14) rises above 70 on 1H timeframe',
        priority: 1,
        conditions: 'RSI > 70, Price below 200 EMA',
        actions: 'Enter short with 2% risk, TP at RSI < 50',
      },
    ],
    stats: { tasks: 2, triggers: 8 },
    tags: ['RSI', 'Mean Reversion', 'Scalping'],
    isOfficial: true,
  },
  {
    id: 'macd-momentum',
    name: 'MACD Momentum Trader',
    description: 'Rides strong trends by entering on MACD crossovers with multi-timeframe confirmation. Executes both long and short positions with momentum.',
    category: 'momentum',
    difficulty: 'intermediate',
    config: {
      strategy: 'MACD Momentum Following',
      personality: 'Aggressive trend follower that capitalizes on momentum shifts. Uses MACD crossovers confirmed by histogram strength. Holds positions for momentum continuation.',
      approvedPairs: ['BTC', 'ETH', 'SOL', 'DOGE'],
      policies: {
        maxLeverage: 8,
        maxPositionSizeUsd: 800,
        maxPositionSizePct: 8,
        maxDrawdownPct: 20,
        positionSizing: {
          strategy: 'volatility_adjusted',
        },
        trailingStop: {
          enabled: true,
          type: 'atr',
          atrMultiplier: 2,
        },
      },
    },
    goals: [
      {
        description: 'Enter LONG on bullish MACD crossover when histogram turns positive',
        priority: 1,
        conditions: 'MACD line crosses above signal, Histogram > 0',
        actions: 'Enter long, trail stop at 2x ATR',
      },
      {
        description: 'Enter SHORT on bearish MACD crossover when histogram turns negative',
        priority: 1,
        conditions: 'MACD line crosses below signal, Histogram < 0',
        actions: 'Enter short, trail stop at 2x ATR',
      },
    ],
    stats: { tasks: 2, triggers: 8 },
    tags: ['MACD', 'Momentum', 'Trend Following'],
    isOfficial: true,
  },
  {
    id: 'ema-crossover-scalper',
    name: 'EMA Crossover Scalper',
    description: 'Fast-paced scalping using EMA12/EMA26 crossovers on 15m. Executes multiple quick longs and shorts throughout the day.',
    category: 'scalping',
    difficulty: 'intermediate',
    config: {
      strategy: 'EMA Crossover Scalping',
      personality: 'Active scalper that thrives on quick EMA crossover signals. Takes many small positions throughout the day. Focuses on high probability setups with tight risk management.',
      approvedPairs: ['BTC', 'ETH'],
      policies: {
        maxLeverage: 10,
        maxPositionSizeUsd: 300,
        maxPositionSizePct: 3,
        maxDrawdownPct: 10,
        positionSizing: {
          strategy: 'fixed_fractional',
          maxRiskPerTrade: 1,
        },
        trailingStop: {
          enabled: true,
          type: 'step',
        },
      },
      llmConfig: {
        primaryModel: 'gpt-4o-mini',
        temperature: 0.2,
      },
    },
    goals: [
      {
        description: 'LONG when EMA12 crosses above EMA26 on 15m chart',
        priority: 1,
        conditions: 'EMA12 > EMA26, Volume above average',
        actions: 'Quick scalp entry, target 0.5% profit',
      },
      {
        description: 'SHORT when EMA12 crosses below EMA26 on 15m chart',
        priority: 1,
        conditions: 'EMA12 < EMA26, Volume above average',
        actions: 'Quick scalp entry, target 0.5% profit',
      },
      {
        description: 'Exit all positions when approaching key resistance/support',
        priority: 2,
        conditions: 'Price near S/R levels',
        actions: 'Close positions, wait for breakout',
      },
    ],
    stats: { tasks: 3, triggers: 0 },
    tags: ['EMA', 'Scalping', '15m'],
    isOfficial: true,
  },
  {
    id: 'bollinger-range-trader',
    name: 'Bollinger Band Range Trader',
    description: 'Trades mean reversion within Bollinger Bands. Executes longs at lower band and shorts at upper band in ranging markets.',
    category: 'reversal',
    difficulty: 'beginner',
    config: {
      strategy: 'Bollinger Band Mean Reversion',
      personality: 'Calm range trader that profits from price oscillations within Bollinger Bands. Avoids trending markets and waits for band touches before entering.',
      approvedPairs: ['BTC', 'ETH', 'SOL'],
      policies: {
        maxLeverage: 5,
        maxPositionSizeUsd: 600,
        maxPositionSizePct: 6,
        maxDrawdownPct: 15,
        positionSizing: {
          strategy: 'fixed_fractional',
          maxRiskPerTrade: 2,
        },
        trailingStop: {
          enabled: true,
          type: 'percentage',
          trailPercent: 2,
        },
      },
    },
    goals: [
      {
        description: 'LONG when price touches or breaks below lower Bollinger Band',
        priority: 1,
        conditions: 'Price <= Lower BB, BB width > 3%',
        actions: 'Enter long, target middle band',
      },
      {
        description: 'SHORT when price touches or breaks above upper Bollinger Band',
        priority: 1,
        conditions: 'Price >= Upper BB, BB width > 3%',
        actions: 'Enter short, target middle band',
      },
      {
        description: 'Avoid trading when Bollinger Bands are tight (squeeze)',
        priority: 3,
        conditions: 'BB width < 2%',
        actions: 'Wait for breakout expansion',
      },
    ],
    stats: { tasks: 3, triggers: 8 },
    tags: ['Bollinger Bands', 'Range Trading', 'Mean Reversion'],
    isOfficial: true,
  },
  {
    id: 'golden-cross-swing',
    name: 'Golden/Death Cross Swing Trader',
    description: 'Long-term trend following using SMA50/SMA200 crossovers. Executes major long and short positions on cross signals.',
    category: 'swing',
    difficulty: 'beginner',
    config: {
      strategy: 'Golden/Death Cross Trend Following',
      personality: 'Patient swing trader that follows major trend shifts. Uses 50/200 SMA crossovers for high-conviction entries. Holds positions for days to weeks.',
      approvedPairs: ['BTC', 'ETH'],
      policies: {
        maxLeverage: 3,
        maxPositionSizeUsd: 1000,
        maxPositionSizePct: 10,
        maxDrawdownPct: 25,
        positionSizing: {
          strategy: 'kelly_criterion',
        },
        trailingStop: {
          enabled: true,
          type: 'percentage',
          trailPercent: 5,
        },
      },
    },
    goals: [
      {
        description: 'Open LONG on Golden Cross (SMA50 crosses above SMA200)',
        priority: 1,
        conditions: 'SMA50 > SMA200, Previous SMA50 < SMA200',
        actions: 'Enter long with large position, trail 5%',
      },
      {
        description: 'Open SHORT on Death Cross (SMA50 crosses below SMA200)',
        priority: 1,
        conditions: 'SMA50 < SMA200, Previous SMA50 > SMA200',
        actions: 'Enter short with large position, trail 5%',
      },
      {
        description: 'Add to winning positions on pullbacks',
        priority: 2,
        conditions: 'Existing profit > 5%, Price pulls back 2%',
        actions: 'Add 50% to position',
      },
    ],
    stats: { tasks: 3, triggers: 8 },
    tags: ['SMA', 'Swing Trading', 'Trend Following'],
    isOfficial: true,
  },
  {
    id: 'stochastic-reversal',
    name: 'Stochastic Reversal Trader',
    description: 'Uses Stochastic Oscillator for precise reversal entries. Executes longs on oversold and shorts on overbought with divergence detection.',
    category: 'reversal',
    difficulty: 'intermediate',
    config: {
      strategy: 'Stochastic Reversal with Divergence',
      personality: 'Technical analyst focused on stochastic extremes and divergences. Looks for hidden divergences between price and stochastic for high-probability reversals.',
      approvedPairs: ['BTC', 'ETH', 'SOL', 'BNB'],
      policies: {
        maxLeverage: 6,
        maxPositionSizeUsd: 700,
        maxPositionSizePct: 7,
        maxDrawdownPct: 18,
        positionSizing: {
          strategy: 'risk_per_trade',
          maxRiskPerTrade: 2.5,
        },
        trailingStop: {
          enabled: true,
          type: 'breakeven',
        },
      },
    },
    goals: [
      {
        description: 'LONG when Stochastic K crosses above D in oversold zone (<20)',
        priority: 1,
        conditions: 'Stoch K < 20, K crosses above D',
        actions: 'Enter long, stop below recent low',
      },
      {
        description: 'SHORT when Stochastic K crosses below D in overbought zone (>80)',
        priority: 1,
        conditions: 'Stoch K > 80, K crosses below D',
        actions: 'Enter short, stop above recent high',
      },
    ],
    stats: { tasks: 2, triggers: 8 },
    tags: ['Stochastic', 'Reversal', 'Divergence'],
    isOfficial: true,
  },
  // ==================== Advanced Strategies ====================
  {
    id: 'funding-rate-arb',
    name: 'Funding Rate Arbitrage',
    description: 'Exploits extreme funding rates by taking contrarian positions. Longs when funding is very negative, shorts when very positive.',
    category: 'reversal',
    difficulty: 'advanced',
    config: {
      strategy: 'Funding Rate Contrarian',
      personality: 'Data-driven contrarian that profits from funding rate extremes. When the crowd is overleveraged one direction, takes the opposite side for funding payments plus mean reversion.',
      approvedPairs: ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP'],
      policies: {
        maxLeverage: 3,
        maxPositionSizeUsd: 1500,
        maxPositionSizePct: 15,
        maxDrawdownPct: 20,
        positionSizing: {
          strategy: 'volatility_adjusted',
        },
        trailingStop: {
          enabled: false,
          type: 'percentage',
        },
      },
      llmConfig: {
        primaryModel: 'claude-sonnet-4-20250514',
        temperature: 0.3,
      },
    },
    goals: [
      {
        description: 'LONG when funding rate is extremely negative (<-0.03%)',
        priority: 1,
        conditions: 'Funding Rate < -0.03%, OI decreasing',
        actions: 'Enter long, collect funding payments',
      },
      {
        description: 'SHORT when funding rate is extremely positive (>0.03%)',
        priority: 1,
        conditions: 'Funding Rate > 0.03%, OI decreasing',
        actions: 'Enter short, collect funding payments',
      },
    ],
    stats: { tasks: 2, triggers: 4 },
    tags: ['Funding Rate', 'Arbitrage', 'Contrarian'],
    isOfficial: true,
  },
  {
    id: 'breakout-hunter',
    name: 'Volatility Breakout Hunter',
    description: 'Identifies and trades breakouts from consolidation zones. Uses ATR expansion and volume spikes to confirm breakout validity.',
    category: 'momentum',
    difficulty: 'advanced',
    config: {
      strategy: 'Volatility Breakout',
      personality: 'Explosive trader that hunts for breakout opportunities. Waits patiently during consolidation, then strikes aggressively when volatility expands with volume confirmation.',
      approvedPairs: ['BTC', 'ETH', 'SOL', 'HYPE'],
      policies: {
        maxLeverage: 10,
        maxPositionSizeUsd: 500,
        maxPositionSizePct: 5,
        maxDrawdownPct: 15,
        positionSizing: {
          strategy: 'volatility_adjusted',
        },
        trailingStop: {
          enabled: true,
          type: 'atr',
          atrMultiplier: 1.5,
        },
      },
    },
    goals: [
      {
        description: 'LONG on upside breakout from tight Bollinger Band squeeze',
        priority: 1,
        conditions: 'BB width expands 50%+, Price breaks upper band, Volume 2x average',
        actions: 'Enter long aggressively, trail with ATR',
      },
      {
        description: 'SHORT on downside breakout from tight Bollinger Band squeeze',
        priority: 1,
        conditions: 'BB width expands 50%+, Price breaks lower band, Volume 2x average',
        actions: 'Enter short aggressively, trail with ATR',
      },
    ],
    stats: { tasks: 2, triggers: 6 },
    tags: ['Breakout', 'Volatility', 'ATR'],
    isOfficial: true,
  },
];

// Helper functions
export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: AgentTemplate['category']): AgentTemplate[] {
  return AGENT_TEMPLATES.filter(t => t.category === category);
}

export function getOfficialTemplates(): AgentTemplate[] {
  return AGENT_TEMPLATES.filter(t => t.isOfficial);
}

export function searchTemplates(query: string): AgentTemplate[] {
  const lowerQuery = query.toLowerCase();
  return AGENT_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
