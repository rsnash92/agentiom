'use client';

import { useState, useEffect } from 'react';
import { ModelSelector } from '@/components/agent';
import { AgentLLMConfig, DEFAULT_LLM_CONFIG } from '@/lib/llm/types';
import { useAuth } from '@/lib/hooks';

// Position sizing strategy definitions
const POSITION_SIZING_STRATEGIES = [
  {
    id: 'fixed_fractional',
    name: 'Fixed Percentage',
    description: 'Risk a fixed % of account per trade',
    icon: '📊',
  },
  {
    id: 'kelly_criterion',
    name: 'Kelly Criterion',
    description: 'Optimize for long-term growth based on win rate',
    icon: '📈',
  },
  {
    id: 'volatility_adjusted',
    name: 'Volatility-Adjusted',
    description: 'Smaller positions in volatile markets',
    icon: '🌊',
  },
  {
    id: 'risk_per_trade',
    name: 'Fixed Risk',
    description: 'Risk $X per trade regardless of setup',
    icon: '🎯',
  },
] as const;

// Trailing stop type definitions
const TRAILING_STOP_TYPES = [
  {
    id: 'percentage',
    name: 'Percentage',
    description: 'Trail by a fixed percentage',
  },
  {
    id: 'atr',
    name: 'ATR-Based',
    description: 'Trail by multiple of ATR (volatility-adaptive)',
  },
  {
    id: 'step',
    name: 'Step',
    description: 'Move stop in increments at gain thresholds',
  },
  {
    id: 'breakeven',
    name: 'Breakeven',
    description: 'Move to breakeven after profit threshold',
  },
] as const;

type PositionSizingStrategy = typeof POSITION_SIZING_STRATEGIES[number]['id'];
type TrailingStopType = typeof TRAILING_STOP_TYPES[number]['id'];

interface TradingConfig {
  positionSizing: {
    strategy: PositionSizingStrategy;
    maxRiskPerTrade?: number;
    kellyFraction?: number;
    volatilityMultiplier?: number;
  };
  trailingStop: {
    enabled: boolean;
    type: TrailingStopType;
    trailPercent?: number;
    atrMultiplier?: number;
    stepPercent?: number;
    stepGain?: number;
    breakevenTriggerPercent?: number;
  };
}

const DEFAULT_TRADING_CONFIG: TradingConfig = {
  positionSizing: { strategy: 'fixed_fractional' },
  trailingStop: { enabled: true, type: 'percentage', trailPercent: 2 },
};

interface SettingsPanelProps {
  agentName?: string;
  agentId?: string;
  agentStatus?: 'active' | 'inactive';
  cdxBalance?: number;
  activationRequirement?: number;
  securityStatus?: string;
  usageType?: string;
  onActivateAgent?: () => void;
  onGetCDX?: () => void;
  onClaimCredits?: () => void;
}

export function SettingsPanel({
  agentName = 'My Bollinger Band Range Trader',
  agentId,
  agentStatus = 'inactive',
  cdxBalance = 0,
  activationRequirement = 10000,
  securityStatus = 'Protected & Encrypted',
  usageType = 'Pay-per-execution',
  onActivateAgent,
  onGetCDX,
  onClaimCredits,
}: SettingsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState<AgentLLMConfig>(DEFAULT_LLM_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [tradingConfig, setTradingConfig] = useState<TradingConfig>(DEFAULT_TRADING_CONFIG);
  const [savingTradingConfig, setSavingTradingConfig] = useState(false);
  const { getAccessToken } = useAuth();

  const isEligibleForCredits = cdxBalance >= 100000;
  const hasInsufficientBalance = cdxBalance < activationRequirement;

  // Fetch LLM config when agentId changes
  useEffect(() => {
    if (!agentId) return;

    async function fetchConfig() {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/agents/${agentId}/llm-config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLlmConfig(data.llmConfig);
        }
      } catch (error) {
        console.error('Failed to fetch LLM config:', error);
      }
    }

    fetchConfig();
  }, [agentId, getAccessToken]);

  // Fetch trading config when agentId changes
  useEffect(() => {
    if (!agentId) return;

    async function fetchTradingConfig() {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/agents/${agentId}/trading-config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTradingConfig({
            positionSizing: data.positionSizing || DEFAULT_TRADING_CONFIG.positionSizing,
            trailingStop: data.trailingStop || DEFAULT_TRADING_CONFIG.trailingStop,
          });
        }
      } catch (error) {
        console.error('Failed to fetch trading config:', error);
      }
    }

    fetchTradingConfig();
  }, [agentId, getAccessToken]);

  // Save LLM config
  const handleLLMConfigChange = async (newConfig: AgentLLMConfig) => {
    setLlmConfig(newConfig);

    if (!agentId) return;

    setSavingConfig(true);
    try {
      const token = await getAccessToken();
      await fetch(`/api/agents/${agentId}/llm-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      console.error('Failed to save LLM config:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  // Save trading config
  const handleTradingConfigChange = async (updates: Partial<TradingConfig>) => {
    const newConfig = {
      ...tradingConfig,
      ...updates,
    };
    setTradingConfig(newConfig);

    if (!agentId) return;

    setSavingTradingConfig(true);
    try {
      const token = await getAccessToken();
      await fetch(`/api/agents/${agentId}/trading-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to save trading config:', error);
    } finally {
      setSavingTradingConfig(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="flex flex-col h-full bg-background-secondary overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <GearIcon className="w-5 h-5 text-foreground-muted" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{agentName} Settings</h3>
            <p className="text-xs text-foreground-muted">Agent Configuration</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Agent Status Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
              <PowerIcon className="w-6 h-6 text-foreground-muted" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="text-base font-semibold">Agent Status</h4>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-md">
                    <WalletIcon className="w-3.5 h-3.5 text-foreground-muted" />
                    <span className="text-xs text-foreground-muted">CDX Balance:</span>
                    <span className="text-xs font-semibold text-primary">{cdxBalance}</span>
                  </div>
                  <button
                    onClick={onActivateAgent}
                    disabled={hasInsufficientBalance}
                    className="flex items-center gap-1.5 px-3 py-1 bg-background border border-border rounded-md text-xs text-foreground-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Activate Agent
                  </button>
                </div>
              </div>
              <span className={`text-sm ${agentStatus === 'active' ? 'text-success' : 'text-foreground-muted'}`}>
                {agentStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ShieldIcon className="w-4 h-4 text-foreground-muted" />
              </div>
              <div className="text-xs font-medium mb-0.5">Security Status</div>
              <div className="text-xs text-success">{securityStatus}</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-foreground-muted">Activation Requirement</span>
                <InfoIcon className="w-3 h-3 text-foreground-subtle" />
              </div>
              <div className="text-xs text-foreground-muted">{activationRequirement.toLocaleString()} CDX on BASE</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <InfoIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xs font-medium mb-0.5">Usage Type</div>
              <div className="text-xs text-foreground-muted">{usageType}</div>
            </div>
          </div>

          {/* Warning Banner */}
          {hasInsufficientBalance && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <WarningIcon className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-medium text-error mb-1">Insufficient CDX Balance</h5>
                  <p className="text-xs text-error/80 mb-2">
                    Activation requirement: {activationRequirement.toLocaleString()} CDX on BASE network. Your connected wallet and/or agent wallets must collectively hold this amount. Current balance: {cdxBalance} CDX
                  </p>
                  <button
                    onClick={onGetCDX}
                    className="text-xs text-primary hover:underline"
                  >
                    Get CDX →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Early Access Credits Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
              <DollarIcon className="w-6 h-6 text-foreground-muted" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div>
                  <h4 className="text-base font-semibold">Early Access Credits</h4>
                  <span className="text-sm text-foreground-muted">Not Eligible</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-full">
                    <CheckCircleIcon className={`w-3.5 h-3.5 ${isEligibleForCredits ? 'text-success' : 'text-foreground-muted'}`} />
                    <span className="text-xs">Status:</span>
                    <span className={`text-xs font-medium ${isEligibleForCredits ? 'text-success' : 'text-error'}`}>
                      {isEligibleForCredits ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                  <button
                    onClick={onClaimCredits}
                    disabled={!isEligibleForCredits}
                    className="flex items-center gap-1.5 px-3 py-1 bg-background border border-border rounded-md text-xs text-foreground-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <DollarIcon className="w-3.5 h-3.5" />
                    Claim Credits
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Credits Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <WalletIcon className="w-4 h-4 text-foreground-muted" />
              </div>
              <div className="text-xs font-medium mb-0.5">CDX Balance</div>
              <div className="text-xs text-primary">{cdxBalance} CDX</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <span className="text-xs text-foreground-muted">Requirements</span>
                <InfoIcon className="w-3 h-3 text-foreground-subtle ml-1" />
              </div>
              <div className="text-xs text-foreground-muted">10,000 CDX + Eligibility</div>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircleIcon className="w-4 h-4 text-success" />
              </div>
              <div className="text-xs font-medium mb-0.5">Credits Type</div>
              <div className="text-xs text-foreground-muted">Early Access Bonus</div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-primary mb-1">Early Access Status</h5>
                <p className="text-xs text-primary/80">
                  You are eligible to claim 10,000 credits if you hold at least 100,000 CDX tokens.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Models Section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => toggleSection('aimodels')}
            className="w-full flex items-center gap-3 p-4 hover:bg-background/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-semibold">AI Models</h4>
              <p className="text-xs text-foreground-muted">Configure LLM providers and parameters</p>
            </div>
            <div className="flex items-center gap-2">
              {savingConfig && (
                <span className="text-xs text-foreground-muted">Saving...</span>
              )}
              <ChevronIcon className={`w-5 h-5 text-foreground-muted transition-transform ${expandedSection === 'aimodels' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedSection === 'aimodels' && (
            <div className="px-4 pb-4 border-t border-border">
              <div className="pt-4">
                <ModelSelector
                  config={llmConfig}
                  onConfigChange={handleLLMConfigChange}
                  disabled={savingConfig}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expandable Sections */}
        <SettingsSection
          icon={<PersonIcon className="w-5 h-5 text-foreground-muted" />}
          title="Core Personality"
          description="Define the fundamental character and approach"
          expanded={expandedSection === 'personality'}
          onToggle={() => toggleSection('personality')}
        />

        <SettingsSection
          icon={<BrainIcon className="w-5 h-5 text-foreground-muted" />}
          title="Thinking & Learning"
          description="Configure reasoning patterns and learning behavior"
          expanded={expandedSection === 'thinking'}
          onToggle={() => toggleSection('thinking')}
        />

        {/* Trading Config Section - Custom with dropdowns */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => toggleSection('trading')}
            className="w-full flex items-center gap-3 p-4 hover:bg-background/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
              <TrendUpIcon className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-semibold">Trading Config</h4>
              <p className="text-xs text-foreground-muted">Position sizing and risk management</p>
            </div>
            <div className="flex items-center gap-2">
              {savingTradingConfig && (
                <span className="text-xs text-foreground-muted">Saving...</span>
              )}
              <ChevronIcon className={`w-5 h-5 text-foreground-muted transition-transform ${expandedSection === 'trading' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedSection === 'trading' && (
            <div className="px-4 pb-4 border-t border-border">
              <div className="pt-4 space-y-4">
                {/* Position Sizing Strategy */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">
                    Position Sizing Strategy
                  </label>
                  <select
                    value={tradingConfig.positionSizing.strategy}
                    onChange={(e) => handleTradingConfigChange({
                      positionSizing: {
                        ...tradingConfig.positionSizing,
                        strategy: e.target.value as PositionSizingStrategy,
                      },
                    })}
                    disabled={savingTradingConfig}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    {POSITION_SIZING_STRATEGIES.map((strategy) => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.icon} {strategy.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-foreground-muted">
                    {POSITION_SIZING_STRATEGIES.find(s => s.id === tradingConfig.positionSizing.strategy)?.description}
                  </p>
                </div>

                {/* Trailing Stop Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-foreground">
                      Trailing Stop
                    </label>
                    <button
                      onClick={() => handleTradingConfigChange({
                        trailingStop: {
                          ...tradingConfig.trailingStop,
                          enabled: !tradingConfig.trailingStop.enabled,
                        },
                      })}
                      disabled={savingTradingConfig}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        tradingConfig.trailingStop.enabled ? 'bg-success' : 'bg-border'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          tradingConfig.trailingStop.enabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                        style={{ transform: tradingConfig.trailingStop.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </div>

                  {tradingConfig.trailingStop.enabled && (
                    <div className="space-y-3">
                      <select
                        value={tradingConfig.trailingStop.type}
                        onChange={(e) => handleTradingConfigChange({
                          trailingStop: {
                            ...tradingConfig.trailingStop,
                            type: e.target.value as TrailingStopType,
                          },
                        })}
                        disabled={savingTradingConfig}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                      >
                        {TRAILING_STOP_TYPES.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-foreground-muted">
                        {TRAILING_STOP_TYPES.find(t => t.id === tradingConfig.trailingStop.type)?.description}
                      </p>

                      {/* Trail Percent for percentage type */}
                      {tradingConfig.trailingStop.type === 'percentage' && (
                        <div>
                          <label className="block text-xs text-foreground-muted mb-1">
                            Trail Percent (%)
                          </label>
                          <input
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={tradingConfig.trailingStop.trailPercent || 2}
                            onChange={(e) => handleTradingConfigChange({
                              trailingStop: {
                                ...tradingConfig.trailingStop,
                                trailPercent: parseFloat(e.target.value),
                              },
                            })}
                            disabled={savingTradingConfig}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* ATR Multiplier for atr type */}
                      {tradingConfig.trailingStop.type === 'atr' && (
                        <div>
                          <label className="block text-xs text-foreground-muted mb-1">
                            ATR Multiplier
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.5"
                            value={tradingConfig.trailingStop.atrMultiplier || 2}
                            onChange={(e) => handleTradingConfigChange({
                              trailingStop: {
                                ...tradingConfig.trailingStop,
                                atrMultiplier: parseFloat(e.target.value),
                              },
                            })}
                            disabled={savingTradingConfig}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Breakeven trigger for breakeven type */}
                      {tradingConfig.trailingStop.type === 'breakeven' && (
                        <div>
                          <label className="block text-xs text-foreground-muted mb-1">
                            Breakeven Trigger (%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="0.5"
                            value={tradingConfig.trailingStop.breakevenTriggerPercent || 2}
                            onChange={(e) => handleTradingConfigChange({
                              trailingStop: {
                                ...tradingConfig.trailingStop,
                                breakevenTriggerPercent: parseFloat(e.target.value),
                              },
                            })}
                            disabled={savingTradingConfig}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
}

function SettingsSection({ icon, title, description, expanded, onToggle }: SettingsSectionProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-background/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-foreground-muted">{description}</p>
        </div>
        <ChevronIcon className={`w-5 h-5 text-foreground-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="pt-4 text-xs text-foreground-subtle">
            Configuration options coming soon...
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18.36 6.64a9 9 0 11-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z" />
      <path d="M1 10h22" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  );
}
