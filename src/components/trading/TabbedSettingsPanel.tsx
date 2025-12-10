'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgent, useAuth } from '@/lib/hooks';

interface TabbedSettingsPanelProps {
  agentId: string;
  onStatusChange?: () => Promise<void>; // Callback after status changes
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
  { id: 'fixed_fractional', name: 'Fixed %', description: 'Risk fixed % of account' },
  { id: 'kelly_criterion', name: 'Kelly', description: 'Optimal growth sizing' },
  { id: 'volatility_adjusted', name: 'Vol-Adj', description: 'Adapt to volatility' },
  { id: 'risk_per_trade', name: 'Fixed $', description: 'Fixed dollar risk' },
] as const;

const STOP_LOSS_TYPES = [
  { id: 'fixed', name: 'Fixed', description: 'Static stop-loss' },
  { id: 'percentage', name: 'Trail %', description: 'Follows by %' },
  { id: 'atr', name: 'ATR', description: 'Volatility-based' },
  { id: 'breakeven', name: 'B/E', description: 'Move to entry' },
  { id: 'step', name: 'Step', description: 'Step-based trailing' },
] as const;

const LLM_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek', description: 'Fast & affordable' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI flagship' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & cheap' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet', description: 'Anthropic balanced' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus', description: 'Most capable' },
] as const;

type PositionSizingStrategy = typeof POSITION_SIZING_STRATEGIES[number]['id'];
type StopLossType = typeof STOP_LOSS_TYPES[number]['id'];

export function TabbedSettingsPanel({ agentId, onStatusChange }: TabbedSettingsPanelProps) {
  const { agent, updateAgent, executeOnce, toggleStatus } = useAgent(agentId);
  const { getAccessToken } = useAuth();
  const [isToggling, setIsToggling] = useState(false);

  const [activeTab, setActiveTab] = useState<'trade' | 'agent'>('trade');
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<{
    success: boolean;
    message: string;
    decisions?: Array<{
      coin: string;
      action: string;
      confidence: number;
      reasoning: string;
    }>;
  } | null>(null);

  // Trade Settings State
  const [positionSizing, setPositionSizing] = useState<PositionSizingStrategy>('fixed_fractional');
  const [stopLossType, setStopLossType] = useState<StopLossType>('percentage');
  const [maxLeverage, setMaxLeverage] = useState(10);
  const [maxPositionSizeUsd, setMaxPositionSizeUsd] = useState(1000);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(20);
  const [trailPercent, setTrailPercent] = useState(2);

  // Agent Settings State
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL']);
  const [prompt, setPrompt] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [executionInterval, setExecutionInterval] = useState(300);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');

  // LLM Usage
  const [llmUsage, setLlmUsage] = useState<{
    totalCalls: number;
    totalCost: number;
  } | null>(null);

  // Load agent data
  useEffect(() => {
    if (agent) {
      // Trade settings
      setPositionSizing(agent.policies?.positionSizing?.strategy || 'fixed_fractional');
      const trailingStop = agent.policies?.trailingStop;
      if (trailingStop?.enabled && trailingStop?.type) {
        setStopLossType(trailingStop.type);
      } else {
        setStopLossType('fixed');
      }
      setMaxLeverage(agent.policies?.maxLeverage ?? 10);
      setMaxPositionSizeUsd(agent.policies?.maxPositionSizeUsd ?? 1000);
      setMaxDrawdownPct(agent.policies?.maxDrawdownPct ?? 20);
      setTrailPercent(agent.policies?.trailingStop?.trailPercent ?? 2);

      // Agent settings
      setSelectedSymbols(agent.policies?.approvedPairs || ['BTC', 'ETH', 'SOL']);
      setPrompt(agent.personality || '');
      setConfidenceThreshold(agent.policies?.confidenceThreshold ?? 70);
      const agentRecord = agent as unknown as { executionInterval?: number; llmConfig?: { primaryModel?: string } };
      setExecutionInterval(agentRecord.executionInterval || 300);
      setSelectedModel(agentRecord.llmConfig?.primaryModel || 'deepseek-chat');
    }
  }, [agent]);

  // Fetch LLM usage
  const fetchLlmUsage = useCallback(async () => {
    if (!agentId) return;
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
        });
      }
    } catch (error) {
      console.error('Failed to fetch LLM usage:', error);
    }
  }, [agentId, getAccessToken]);

  useEffect(() => {
    fetchLlmUsage();
  }, [fetchLlmUsage]);

  const handleSave = async () => {
    if (!agent) return;
    setIsSaving(true);
    try {
      await updateAgent({
        personality: prompt,
        executionIntervalSeconds: executionInterval,
        model: selectedModel,
        policies: {
          ...agent.policies,
          approvedPairs: selectedSymbols,
          confidenceThreshold,
          maxLeverage,
          maxPositionSizeUsd,
          maxDrawdownPct,
          positionSizing: {
            ...agent.policies?.positionSizing,
            strategy: positionSizing,
          },
          trailingStop: {
            ...agent.policies?.trailingStop,
            enabled: stopLossType !== 'fixed',
            type: stopLossType === 'fixed' ? 'percentage' : stopLossType,
            trailPercent: trailPercent,
          },
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      await toggleStatus();
      // Notify parent to refresh UI
      await onStatusChange?.();
    } finally {
      setIsToggling(false);
    }
  };

  const handleRunOnce = async () => {
    setIsExecuting(true);
    setExecuteResult(null);
    try {
      const result = await executeOnce();
      if (result) {
        setExecuteResult({
          success: true,
          message: result.message || 'Analysis complete',
          decisions: result.decisions,
        });
      } else {
        setExecuteResult({ success: false, message: 'No result returned' });
      }
    } catch (error) {
      setExecuteResult({ success: false, message: error instanceof Error ? error.message : 'Execution failed' });
    } finally {
      setIsExecuting(false);
      // Clear result after 10 seconds (longer to read decisions)
      setTimeout(() => setExecuteResult(null), 10000);
    }
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('trade')}
          className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'trade'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <TrendIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          TRADE
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'agent'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <BotIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          AGENT
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-5">
        {activeTab === 'trade' ? (
          // TRADE SETTINGS TAB
          <>
            {/* Position Sizing */}
            <Section title="Position Sizing">
              <div className="grid grid-cols-2 gap-2">
                {POSITION_SIZING_STRATEGIES.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() => setPositionSizing(strategy.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      positionSizing === strategy.id
                        ? 'border-foreground bg-foreground/10'
                        : 'border-border hover:border-foreground-muted'
                    }`}
                  >
                    <div className="text-xs font-semibold">{strategy.name}</div>
                    <div className="text-[10px] text-foreground-muted">{strategy.description}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Stop-Loss Type */}
            <Section title="Stop-Loss Type">
              <div className="grid grid-cols-5 gap-1">
                {STOP_LOSS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setStopLossType(type.id)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      stopLossType === type.id
                        ? 'border-foreground bg-foreground/10'
                        : 'border-border hover:border-foreground-muted'
                    }`}
                  >
                    <div className="text-xs font-semibold">{type.name}</div>
                  </button>
                ))}
              </div>
              {stopLossType === 'percentage' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground-muted">Trail %</span>
                    <span className="font-semibold">{trailPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={trailPercent}
                    onChange={(e) => setTrailPercent(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </Section>

            {/* Risk Management */}
            <Section title="Risk Management">
              <div className="space-y-4">
                {/* Max Leverage */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-foreground-muted">Max Leverage</span>
                    <span className="font-semibold">{maxLeverage}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={maxLeverage}
                    onChange={(e) => setMaxLeverage(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-foreground-subtle mt-1">
                    <span>1x</span>
                    <span>25x</span>
                    <span>50x</span>
                  </div>
                </div>

                {/* Max Position Size */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-foreground-muted">Max Position</span>
                    <span className="font-semibold">${maxPositionSizeUsd.toLocaleString()}</span>
                  </div>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    value={maxPositionSizeUsd}
                    onChange={(e) => setMaxPositionSizeUsd(parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
                  />
                </div>

                {/* Max Drawdown */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-foreground-muted">Max Drawdown</span>
                    <span className="font-semibold">{maxDrawdownPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={maxDrawdownPct}
                    onChange={(e) => setMaxDrawdownPct(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-foreground-subtle mt-1">
                    <span>5%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                  <p className="text-[10px] text-foreground-muted mt-1">Agent pauses if portfolio drops by this amount</p>
                </div>
              </div>
            </Section>
          </>
        ) : (
          // AGENT SETTINGS TAB
          <>
            {/* LLM Model Selection */}
            <Section title="AI Model">
              <div className="grid grid-cols-2 gap-2">
                {LLM_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      selectedModel === model.id
                        ? 'border-foreground bg-foreground/10'
                        : 'border-border hover:border-foreground-muted'
                    }`}
                  >
                    <div className="text-xs font-semibold">{model.name}</div>
                    <div className="text-[10px] text-foreground-muted">{model.description}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Symbol Selection */}
            <Section title="Trading Pairs">
              <div className="flex flex-wrap gap-1.5">
                {SYMBOLS.map((symbol) => (
                  <button
                    key={symbol.id}
                    onClick={() => toggleSymbol(symbol.id)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border ${
                      selectedSymbols.includes(symbol.id)
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-foreground-muted border-border hover:text-foreground hover:border-foreground-muted'
                    }`}
                  >
                    {symbol.id}
                  </button>
                ))}
              </div>
            </Section>

            {/* Prompt */}
            <Section title="Agent Prompt">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your trading strategy..."
                maxLength={1000}
                className="w-full h-24 px-3 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-foreground-subtle focus:outline-none focus:border-foreground resize-none"
              />
              <div className="text-right text-[10px] text-foreground-subtle mt-1">
                {prompt.length}/1000
              </div>
            </Section>

            {/* Confidence Threshold */}
            <Section title="Confidence Threshold">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold">{confidenceThreshold}%</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground-muted">
                  {confidenceThreshold <= 50 ? 'Aggressive' :
                   confidenceThreshold <= 70 ? 'Balanced' : 'Conservative'}
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-[10px] text-foreground-muted mt-2">
                Minimum confidence required to execute trades
              </p>
            </Section>

            {/* Execution Interval */}
            <Section title="Execution Interval">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold">{formatInterval(executionInterval)}</span>
                <span className="text-[10px] text-foreground-muted">
                  ~${((24 * 60 * 60 / executionInterval) * 0.02 * selectedSymbols.length).toFixed(2)}/day
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="3600"
                step="60"
                value={executionInterval}
                onChange={(e) => setExecutionInterval(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-foreground-subtle mt-1">
                <span>1 min</span>
                <span>30 min</span>
                <span>1 hour</span>
              </div>
            </Section>

            {/* LLM Usage */}
            <Section title="Today's AI Usage">
              <div className="flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-lg">
                <div>
                  <div className="text-lg font-bold">
                    ${llmUsage?.totalCost.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-[10px] text-foreground-muted">
                    {llmUsage?.totalCalls || 0} API calls
                  </div>
                </div>
                <button
                  onClick={fetchLlmUsage}
                  className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                  <RefreshIcon className="w-4 h-4 text-foreground-muted" />
                </button>
              </div>
            </Section>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {/* Execution Result */}
        {executeResult && (
          <div className={`text-xs p-2 rounded-lg space-y-2 ${executeResult.success ? 'bg-success/10' : 'bg-error/10'}`}>
            <div className={executeResult.success ? 'text-success font-medium' : 'text-error font-medium'}>
              {executeResult.message}
            </div>
            {executeResult.decisions && executeResult.decisions.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-border/30">
                {executeResult.decisions.map((d, i) => (
                  <div key={i} className="text-foreground-muted">
                    <span className={`font-semibold ${
                      d.action === 'buy' ? 'text-success' :
                      d.action === 'sell' ? 'text-error' :
                      'text-foreground-muted'
                    }`}>
                      {d.coin}: {d.action.toUpperCase()}
                    </span>
                    <span className="text-[10px] ml-1">({d.confidence}%)</span>
                    <div className="text-[10px] text-foreground-subtle truncate" title={d.reasoning}>
                      {d.reasoning.substring(0, 60)}{d.reasoning.length > 60 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main RUN/PAUSE Toggle Button */}
        <button
          onClick={handleToggleStatus}
          disabled={isToggling}
          className={`w-full py-3 font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 ${
            agent?.status === 'active'
              ? 'bg-error/20 text-error hover:bg-error/30'
              : 'bg-success/20 text-success hover:bg-success/30'
          } disabled:opacity-50`}
        >
          {isToggling ? (
            <>
              <span className={`w-4 h-4 border-2 ${agent?.status === 'active' ? 'border-error' : 'border-success'} border-t-transparent rounded-full animate-spin`} />
              {agent?.status === 'active' ? 'Stopping...' : 'Starting...'}
            </>
          ) : agent?.status === 'active' ? (
            <>
              <PauseIcon className="w-4 h-4" />
              PAUSE
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              RUN
            </>
          )}
        </button>

        {/* Secondary actions row */}
        <div className="flex gap-2">
          <button
            onClick={handleRunOnce}
            disabled={isExecuting || agent?.status === 'active'}
            className="flex-1 py-2 text-xs text-foreground-muted hover:text-foreground border border-border rounded-lg hover:bg-foreground/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            title={agent?.status === 'active' ? 'Pause agent first to run manually' : 'Run one analysis cycle'}
          >
            {isExecuting ? (
              <>
                <span className="w-3 h-3 border border-foreground-muted border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshIcon className="w-3 h-3" />
                Run Once
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedSymbols.length === 0}
            className="flex-1 py-2 text-xs bg-foreground text-background font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Section component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-foreground-muted mb-2 block flex items-center gap-2">
        {title}
        <span className="w-full h-px bg-border flex-1 ml-1" />
      </label>
      {children}
    </div>
  );
}

// Icons
function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <path d="M8 16h.01M16 16h.01" />
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

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
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
