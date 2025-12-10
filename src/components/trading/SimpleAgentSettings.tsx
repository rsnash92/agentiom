'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAgent, useAuth } from '@/lib/hooks';

interface SimpleAgentSettingsProps {
  agentId: string;
  onClose?: () => void;
}

const SYMBOLS = [
  { id: 'BTC', name: 'BTC/USDT' },
  { id: 'ETH', name: 'ETH/USDT' },
  { id: 'SOL', name: 'SOL/USDT' },
  { id: 'BNB', name: 'BNB/USDT' },
  { id: 'DOGE', name: 'DOGE/USDT' },
  { id: 'XRP', name: 'XRP/USDT' },
  { id: 'ASTER', name: 'ASTER/USDT' },
  { id: 'HYPE', name: 'HYPE/USDT' },
];

const POSITION_SIZING_STRATEGIES = [
  {
    id: 'fixed_fractional',
    name: 'Fixed Percentage',
    description: 'Risk a fixed % of account per trade. Simple and consistent position sizing.',
    tags: [{ label: 'Conservative', color: 'primary' }, { label: 'Simple', color: 'success' }],
  },
  {
    id: 'kelly_criterion',
    name: 'Kelly Criterion',
    description: 'Mathematically optimal sizing based on win rate and reward ratio for maximum growth.',
    tags: [{ label: 'Advanced', color: 'warning' }, { label: 'Optimal', color: 'primary' }],
  },
  {
    id: 'volatility_adjusted',
    name: 'Volatility-Adjusted',
    description: 'Dynamically reduces position size in volatile markets using ATR-based calculations.',
    tags: [{ label: 'Adaptive', color: 'primary' }, { label: 'Risk-Aware', color: 'success' }],
  },
  {
    id: 'risk_per_trade',
    name: 'Fixed Risk ($)',
    description: 'Risk a fixed dollar amount per trade regardless of account size or market conditions.',
    tags: [{ label: 'Simple', color: 'success' }, { label: 'Fixed', color: 'foreground-muted' }],
  },
] as const;

const STOP_LOSS_TYPES = [
  {
    id: 'fixed',
    name: 'Fixed',
    description: 'Set once at entry, doesn\'t move. Traditional stop-loss placement.',
    tags: [{ label: 'Simple', color: 'success' }, { label: 'Static', color: 'foreground-muted' }],
  },
  {
    id: 'percentage',
    name: 'Trailing %',
    description: 'Follows price by X%. Locks in profits as price moves favorably.',
    tags: [{ label: 'Dynamic', color: 'primary' }, { label: 'Popular', color: 'success' }],
  },
  {
    id: 'atr',
    name: 'Trailing ATR',
    description: 'Follows price by X multiplied by volatility (ATR). Adapts to market conditions.',
    tags: [{ label: 'Adaptive', color: 'primary' }, { label: 'Pro', color: 'warning' }],
  },
  {
    id: 'breakeven',
    name: 'Breakeven',
    description: 'Moves stop to entry price after X% profit. Eliminates downside risk.',
    tags: [{ label: 'Protective', color: 'success' }, { label: 'Risk-Free', color: 'primary' }],
  },
  {
    id: 'step',
    name: 'Step',
    description: 'Locks profit in increments. Moves stop up at each gain threshold.',
    tags: [{ label: 'Advanced', color: 'warning' }, { label: 'Incremental', color: 'primary' }],
  },
] as const;

type PositionSizingStrategy = typeof POSITION_SIZING_STRATEGIES[number]['id'];
type StopLossType = typeof STOP_LOSS_TYPES[number]['id'];

export function SimpleAgentSettings({ agentId, onClose }: SimpleAgentSettingsProps) {
  const { agent, updateAgent, executeOnce } = useAgent(agentId);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL']);
  const [prompt, setPrompt] = useState('');
  const [positionSizing, setPositionSizing] = useState<PositionSizingStrategy>('fixed_fractional');
  const [stopLossType, setStopLossType] = useState<StopLossType>('percentage');
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);
  const [stopLossDropdownOpen, setStopLossDropdownOpen] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [executionInterval, setExecutionInterval] = useState(300); // Default 5 minutes
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<string | null>(null);

  // LLM Usage stats
  const [llmUsage, setLlmUsage] = useState<{
    totalCalls: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    byTask: Array<{ taskType: string; calls: number; cost: number }>;
  } | null>(null);
  const [llmUsageLoading, setLlmUsageLoading] = useState(false);

  const { getAccessToken } = useAuth();
  const strategyDropdownRef = useRef<HTMLDivElement>(null);
  const stopLossDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(event.target as Node)) {
        setStrategyDropdownOpen(false);
      }
      if (stopLossDropdownRef.current && !stopLossDropdownRef.current.contains(event.target as Node)) {
        setStopLossDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch LLM usage stats
  const fetchLlmUsage = useCallback(async () => {
    if (!agentId) return;
    setLlmUsageLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/agents/${agentId}/llm-usage?period=24h`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLlmUsage({
          totalCalls: data.stats.totalCalls,
          totalCost: data.stats.totalCost,
          totalInputTokens: data.stats.totalInputTokens,
          totalOutputTokens: data.stats.totalOutputTokens,
          byTask: data.byTask,
        });
      }
    } catch (error) {
      console.error('Failed to fetch LLM usage:', error);
    } finally {
      setLlmUsageLoading(false);
    }
  }, [agentId, getAccessToken]);

  // Load agent data
  useEffect(() => {
    if (agent) {
      setSelectedSymbols(agent.policies?.approvedPairs || ['BTC', 'ETH', 'SOL']);
      setPrompt(agent.personality || '');
      setPositionSizing(agent.policies?.positionSizing?.strategy || 'fixed_fractional');
      // Map trailing stop type, with 'fixed' as default if not set or disabled
      const trailingStop = agent.policies?.trailingStop;
      if (trailingStop?.enabled && trailingStop?.type) {
        setStopLossType(trailingStop.type);
      } else {
        setStopLossType('fixed');
      }
      // Load confidence threshold (default 50% for demo, 70% for live)
      setConfidenceThreshold(agent.policies?.confidenceThreshold ?? (agent.isDemo ? 50 : 70));
      // Load execution interval (default 300s = 5 minutes)
      // DB column is 'executionInterval', but type says 'executionIntervalSeconds'
      const agentRecord = agent as unknown as { executionInterval?: number; executionIntervalSeconds?: number };
      const interval = agentRecord.executionInterval || agentRecord.executionIntervalSeconds || 300;
      setExecutionInterval(interval);
    }
  }, [agent]);

  // Fetch LLM usage on mount
  useEffect(() => {
    fetchLlmUsage();
  }, [fetchLlmUsage]);

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const selectAll = () => {
    if (selectedSymbols.length === SYMBOLS.length) {
      setSelectedSymbols([]);
    } else {
      setSelectedSymbols(SYMBOLS.map(s => s.id));
    }
  };

  const handleSave = async () => {
    if (!agent) return;

    setIsSaving(true);
    try {
      await updateAgent({
        personality: prompt,
        executionIntervalSeconds: executionInterval,
        policies: {
          ...agent.policies,
          approvedPairs: selectedSymbols,
          confidenceThreshold,
          positionSizing: {
            ...agent.policies?.positionSizing,
            strategy: positionSizing,
          },
          trailingStop: {
            ...agent.policies?.trailingStop,
            enabled: stopLossType !== 'fixed',
            type: stopLossType === 'fixed' ? 'percentage' : stopLossType,
          },
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate estimated daily cost based on interval
  const estimatedDailyCost = () => {
    // Rough estimate: ~$0.02 per execution (varies by model)
    const avgCostPerExecution = 0.02;
    const executionsPerDay = (24 * 60 * 60) / executionInterval;
    return (executionsPerDay * avgCostPerExecution * selectedSymbols.length).toFixed(2);
  };

  // Format interval for display
  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const handleRunNow = async () => {
    setIsExecuting(true);
    setExecuteResult(null);
    try {
      const result = await executeOnce();
      if (result) {
        setExecuteResult(`Executed ${result.results?.length || 0} decisions`);
      } else {
        setExecuteResult('Execution failed - check console');
      }
    } catch (error) {
      setExecuteResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedStrategy = POSITION_SIZING_STRATEGIES.find(s => s.id === positionSizing);
  const selectedStopLoss = STOP_LOSS_TYPES.find(s => s.id === stopLossType);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border">
        <h2 className="text-xs sm:text-sm font-semibold tracking-wide">AGENT SETTINGS</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-background-secondary transition-colors"
          >
            <CloseIcon className="w-4 h-4 text-foreground-muted" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-4 sm:space-y-5">
        {/* Symbol Selection */}
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <label className="text-xs sm:text-sm text-foreground-muted">Select Symbol*</label>
            <button
              onClick={selectAll}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-primary hover:text-primary/80"
            >
              <CheckboxIcon checked={selectedSymbols.length === SYMBOLS.length} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Select All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {SYMBOLS.map((symbol) => (
              <button
                key={symbol.id}
                onClick={() => toggleSymbol(symbol.id)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-medium transition-all ${
                  selectedSymbols.includes(symbol.id)
                    ? 'bg-primary text-black'
                    : 'bg-background-secondary text-foreground-muted hover:text-foreground'
                }`}
              >
                {symbol.id}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block">Your Prompt for Agent</label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your trading strategy prompt..."
              maxLength={1000}
              className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary resize-none text-xs sm:text-sm"
            />
            <span className="absolute bottom-2 right-2 text-[10px] sm:text-xs text-foreground-subtle">
              {prompt.length}/1000
            </span>
          </div>
        </div>

        {/* Position Sizing Strategy Dropdown */}
        <div ref={strategyDropdownRef} className="relative">
          <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block flex items-center gap-2">
            Position Sizing
            <span className="w-full h-px bg-border flex-1 ml-1" />
          </label>

          <button
            onClick={() => {
              setStrategyDropdownOpen(!strategyDropdownOpen);
              setStopLossDropdownOpen(false);
            }}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-primary rounded-lg text-foreground focus:outline-none text-xs sm:text-sm flex items-center justify-between"
          >
            <span>{selectedStrategy?.name}</span>
            <ChevronIcon className={`w-4 h-4 text-foreground-muted transition-transform ${strategyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {strategyDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <span className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide">Position Sizing Strategies</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {POSITION_SIZING_STRATEGIES.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() => {
                      setPositionSizing(strategy.id);
                      setStrategyDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left hover:bg-background/50 transition-colors ${
                      positionSizing === strategy.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className={`text-xs sm:text-sm font-medium ${positionSizing === strategy.id ? 'text-primary' : 'text-foreground'}`}>
                        {strategy.name}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        {strategy.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium border ${
                              tag.color === 'primary' ? 'text-primary border-primary/50' :
                              tag.color === 'success' ? 'text-success border-success/50' :
                              tag.color === 'warning' ? 'text-warning border-warning/50' :
                              'text-foreground-muted border-border'
                            }`}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-foreground-muted leading-relaxed">
                      {strategy.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stop-Loss Type Dropdown */}
        <div ref={stopLossDropdownRef} className="relative">
          <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block flex items-center gap-2">
            Stop-Loss Type
            <span className="w-full h-px bg-border flex-1 ml-1" />
          </label>

          <button
            onClick={() => {
              setStopLossDropdownOpen(!stopLossDropdownOpen);
              setStrategyDropdownOpen(false);
            }}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-error/50 rounded-lg text-foreground focus:outline-none text-xs sm:text-sm flex items-center justify-between"
          >
            <span>{selectedStopLoss?.name}</span>
            <ChevronIcon className={`w-4 h-4 text-foreground-muted transition-transform ${stopLossDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {stopLossDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <span className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide">Stop-Loss Types</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {STOP_LOSS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setStopLossType(type.id);
                      setStopLossDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left hover:bg-background/50 transition-colors ${
                      stopLossType === type.id ? 'bg-error/10 border-l-2 border-l-error' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className={`text-xs sm:text-sm font-medium ${stopLossType === type.id ? 'text-error' : 'text-foreground'}`}>
                        {type.name}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        {type.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium border ${
                              tag.color === 'primary' ? 'text-primary border-primary/50' :
                              tag.color === 'success' ? 'text-success border-success/50' :
                              tag.color === 'warning' ? 'text-warning border-warning/50' :
                              'text-foreground-muted border-border'
                            }`}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-foreground-muted leading-relaxed">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confidence Threshold Slider */}
        <div>
          <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block flex items-center gap-2">
            Minimum Confidence
            <span className="w-full h-px bg-border flex-1 ml-1" />
          </label>

          <div className="px-3 sm:px-4 py-3 sm:py-4 bg-background border border-warning/50 rounded-lg">
            {/* Value display */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-lg sm:text-xl font-bold ${
                confidenceThreshold <= 50 ? 'text-error' :
                confidenceThreshold <= 70 ? 'text-warning' :
                'text-success'
              }`}>
                {confidenceThreshold}%
              </span>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                confidenceThreshold <= 50 ? 'bg-error/20 text-error' :
                confidenceThreshold <= 70 ? 'bg-warning/20 text-warning' :
                'bg-success/20 text-success'
              }`}>
                {confidenceThreshold <= 50 ? 'Aggressive' :
                 confidenceThreshold <= 70 ? 'Balanced' :
                 'Conservative'}
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right,
                  var(--color-warning) 0%,
                  var(--color-warning) ${((confidenceThreshold - 30) / 60) * 100}%,
                  var(--color-background-secondary) ${((confidenceThreshold - 30) / 60) * 100}%,
                  var(--color-background-secondary) 100%)`
              }}
            />

            {/* Labels */}
            <div className="flex justify-between mt-2 text-[9px] sm:text-[10px] text-foreground-subtle">
              <span>30%</span>
              <span>More Trades</span>
              <span>Fewer Trades</span>
              <span>90%</span>
            </div>

            {/* Description */}
            <p className="text-[10px] sm:text-xs text-foreground-muted mt-3 leading-relaxed">
              {confidenceThreshold <= 50
                ? 'Agent will trade on weaker signals. More positions but lower conviction per trade.'
                : confidenceThreshold <= 70
                ? 'Balanced approach. Agent trades when reasonably confident in the setup.'
                : 'Agent only trades on high-conviction setups. Fewer trades but higher quality.'}
            </p>
          </div>
        </div>

        {/* Execution Interval Slider */}
        <div>
          <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block flex items-center gap-2">
            Execution Interval
            <span className="w-full h-px bg-border flex-1 ml-1" />
          </label>

          <div className="px-3 sm:px-4 py-3 sm:py-4 bg-background border border-blue-500/50 rounded-lg">
            {/* Value display */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg sm:text-xl font-bold text-blue-400">
                {formatInterval(executionInterval)}
              </span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-400">
                ~${estimatedDailyCost()}/day
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="60"
              max="3600"
              step="60"
              value={executionInterval}
              onChange={(e) => setExecutionInterval(parseInt(e.target.value))}
              className="w-full h-2 bg-background-secondary rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right,
                  rgb(59, 130, 246) 0%,
                  rgb(59, 130, 246) ${((executionInterval - 60) / (3600 - 60)) * 100}%,
                  var(--color-background-secondary) ${((executionInterval - 60) / (3600 - 60)) * 100}%,
                  var(--color-background-secondary) 100%)`
              }}
            />

            {/* Labels */}
            <div className="flex justify-between mt-2 text-[9px] sm:text-[10px] text-foreground-subtle">
              <span>1 min</span>
              <span>Higher Cost</span>
              <span>Lower Cost</span>
              <span>1 hour</span>
            </div>

            {/* Description */}
            <p className="text-[10px] sm:text-xs text-foreground-muted mt-3 leading-relaxed">
              How often the agent analyzes markets and makes decisions. Shorter intervals = more responsive but higher LLM costs.
            </p>
          </div>
        </div>

        {/* LLM Usage Stats */}
        <div>
          <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block flex items-center gap-2">
            Today&apos;s AI Usage
            <span className="w-full h-px bg-border flex-1 ml-1" />
          </label>

          <div className="px-3 sm:px-4 py-3 sm:py-4 bg-background border border-purple-500/50 rounded-lg">
            {llmUsageLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : llmUsage ? (
              <>
                {/* Cost highlight */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg sm:text-xl font-bold text-purple-400">
                    ${llmUsage.totalCost.toFixed(2)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-foreground-muted">
                    {llmUsage.totalCalls} calls
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background-secondary rounded-lg p-2">
                    <div className="text-foreground-subtle text-[10px] mb-0.5">Analyses</div>
                    <div className="font-medium text-foreground">
                      {llmUsage.byTask.find(t => t.taskType === 'analysis')?.calls || 0}
                    </div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-2">
                    <div className="text-foreground-subtle text-[10px] mb-0.5">Decisions</div>
                    <div className="font-medium text-foreground">
                      {llmUsage.byTask.find(t => t.taskType === 'decision')?.calls || 0}
                    </div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-2">
                    <div className="text-foreground-subtle text-[10px] mb-0.5">Input Tokens</div>
                    <div className="font-medium text-foreground">
                      {(llmUsage.totalInputTokens / 1000).toFixed(1)}k
                    </div>
                  </div>
                  <div className="bg-background-secondary rounded-lg p-2">
                    <div className="text-foreground-subtle text-[10px] mb-0.5">Output Tokens</div>
                    <div className="font-medium text-foreground">
                      {(llmUsage.totalOutputTokens / 1000).toFixed(1)}k
                    </div>
                  </div>
                </div>

                {/* Refresh button */}
                <button
                  onClick={fetchLlmUsage}
                  className="mt-3 w-full py-1.5 text-[10px] sm:text-xs text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1"
                >
                  <RefreshIcon className="w-3 h-3" />
                  Refresh
                </button>
              </>
            ) : (
              <div className="text-center text-foreground-muted text-xs py-4">
                No usage data yet
              </div>
            )}
          </div>
        </div>

        {/* Run Now Button */}
        <div className="pt-1 sm:pt-2">
          <button
            onClick={handleRunNow}
            disabled={isExecuting}
            className="w-full py-2.5 sm:py-3 bg-success/20 text-success font-semibold rounded-lg hover:bg-success/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            {isExecuting ? (
              <>
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-success border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <PlayIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                RUN NOW
              </>
            )}
          </button>
          {executeResult && (
            <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 text-center ${executeResult.includes('Error') ? 'text-error' : 'text-foreground-muted'}`}>
              {executeResult}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-border flex gap-2 sm:gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2 sm:py-2.5 bg-background-secondary text-foreground font-medium rounded-lg hover:bg-background-secondary/80 transition-colors text-xs sm:text-sm"
        >
          CANCEL
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || selectedSymbols.length === 0}
          className="flex-1 py-2 sm:py-2.5 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
        >
          {isSaving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CheckboxIcon({ checked, className = 'w-4 h-4' }: { checked: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      {checked && <path d="M9 12l2 2 4-4" />}
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
