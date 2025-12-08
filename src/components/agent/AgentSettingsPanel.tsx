'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks';
import { ModelSelector } from './ModelSelector';
import { AgentLLMConfig, DEFAULT_LLM_CONFIG } from '@/lib/llm/types';

// Types for agent configuration
export interface AgentPersonality {
  description: string;
  communicationTone: 'professional' | 'casual' | 'technical' | 'friendly';
  responseLength: 'concise' | 'balanced' | 'detailed';
  creativityLevel: number; // 0-100
}

export interface AgentThinking {
  thoughtStyle: 'chain' | 'graph' | 'tree' | 'reflection';
  adaptiveLearning: boolean;
  contextMemory: boolean;
  maxContextLength: number; // 1000-8000 tokens
}

export interface AgentTradingConfig {
  preferredExchange: 'gmx' | 'hyperliquid';
  tradingStyle: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  enforceStopLosses: boolean;
  enforceTakeProfits: boolean;
}

export interface AgentSocialConfig {
  interactionStyle: string;
}

export interface AgentOptimizations {
  skipFinalChatFormatting: boolean;
  skipStepCompletionAssessment: boolean;
  enableModelAutoSelection: boolean;
}

export interface AgentConfig {
  personality: AgentPersonality;
  thinking: AgentThinking;
  trading: AgentTradingConfig;
  social: AgentSocialConfig;
  optimizations: AgentOptimizations;
}

const DEFAULT_CONFIG: AgentConfig = {
  personality: {
    description: '',
    communicationTone: 'professional',
    responseLength: 'concise',
    creativityLevel: 50,
  },
  thinking: {
    thoughtStyle: 'chain',
    adaptiveLearning: false,
    contextMemory: false,
    maxContextLength: 4000,
  },
  trading: {
    preferredExchange: 'hyperliquid',
    tradingStyle: '',
    riskTolerance: 'moderate',
    enforceStopLosses: true,
    enforceTakeProfits: true,
  },
  social: {
    interactionStyle: '',
  },
  optimizations: {
    skipFinalChatFormatting: true,
    skipStepCompletionAssessment: false,
    enableModelAutoSelection: true,
  },
};

interface AgentSettingsPanelProps {
  agentId: string;
  initialPersonality?: string;
  initialStrategy?: string;
  initialLlmConfig?: AgentLLMConfig;
}

export function AgentSettingsPanel({
  agentId,
  initialPersonality = '',
  initialStrategy = '',
  initialLlmConfig,
}: AgentSettingsPanelProps) {
  const [config, setConfig] = useState<AgentConfig>({
    ...DEFAULT_CONFIG,
    personality: {
      ...DEFAULT_CONFIG.personality,
      description: initialPersonality,
    },
    trading: {
      ...DEFAULT_CONFIG.trading,
      tradingStyle: initialStrategy,
    },
  });
  const [llmConfig, setLlmConfig] = useState<AgentLLMConfig>(initialLlmConfig || DEFAULT_LLM_CONFIG);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personality']));
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const { getAccessToken } = useAuth();

  // Track changes
  const updateConfig = useCallback((updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updateLlmConfig = useCallback((newConfig: AgentLLMConfig) => {
    setLlmConfig(newConfig);
    setHasChanges(true);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessToken();
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          personality: config.personality.description,
          strategy: config.trading.tradingStyle,
          llmConfig: llmConfig,
        }),
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Core Personality Section */}
        <SettingsSection
          icon={<PersonIcon className="w-5 h-5 text-purple-400" />}
          title="Core Personality"
          description="Define the fundamental character and approach"
          expanded={expandedSections.has('personality')}
          onToggle={() => toggleSection('personality')}
        >
          <div className="space-y-4">
            {/* Personality Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Personality Description</label>
                <CopyIcon className="w-4 h-4 text-foreground-muted cursor-pointer hover:text-foreground" />
              </div>
              <textarea
                value={config.personality.description}
                onChange={(e) => updateConfig({
                  personality: { ...config.personality, description: e.target.value }
                })}
                placeholder="Describe the agent's personality and approach..."
                className="w-full h-40 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-foreground-muted">Define how the agent approaches problems and interacts</span>
                <span className="text-xs text-foreground-muted">{config.personality.description.length} characters</span>
              </div>
            </div>

            {/* Communication Tone & Response Length */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Communication Tone</label>
                <select
                  value={config.personality.communicationTone}
                  onChange={(e) => updateConfig({
                    personality: { ...config.personality, communicationTone: e.target.value as AgentPersonality['communicationTone'] }
                  })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="professional">Professional - Formal and business-like</option>
                  <option value="casual">Casual - Relaxed and friendly</option>
                  <option value="technical">Technical - Precise and detailed</option>
                  <option value="friendly">Friendly - Warm and approachable</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Response Length</label>
                <select
                  value={config.personality.responseLength}
                  onChange={(e) => updateConfig({
                    personality: { ...config.personality, responseLength: e.target.value as AgentPersonality['responseLength'] }
                  })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="concise">Concise - Brief and to the point</option>
                  <option value="balanced">Balanced - Moderate detail</option>
                  <option value="detailed">Detailed - Comprehensive responses</option>
                </select>
              </div>
            </div>

            {/* Creativity Level Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Creativity Level: {config.personality.creativityLevel}%</label>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.personality.creativityLevel}
                  onChange={(e) => updateConfig({
                    personality: { ...config.personality, creativityLevel: parseInt(e.target.value) }
                  })}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-foreground-muted mt-1">
                  <span>Conservative</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Thinking & Learning Section */}
        <SettingsSection
          icon={<BrainIcon className="w-5 h-5 text-blue-400" />}
          title="Thinking & Learning"
          description="Configure reasoning patterns and learning behavior"
          expanded={expandedSections.has('thinking')}
          onToggle={() => toggleSection('thinking')}
        >
          <div className="space-y-4">
            {/* Thought Style */}
            <div>
              <label className="text-sm font-medium mb-3 block">Thought Style</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'chain', icon: '🔗', name: 'Chain of Thought', desc: 'Sequential reasoning through problems step by step' },
                  { id: 'graph', icon: '🌐', name: 'Graph of Thought', desc: 'Non-linear reasoning with interconnected concepts' },
                  { id: 'tree', icon: '🌳', name: 'Tree of Thought', desc: 'Branching exploration of multiple solution paths' },
                  { id: 'reflection', icon: '💡', name: 'Reflection', desc: 'Self-evaluation and iterative improvement' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => updateConfig({
                      thinking: { ...config.thinking, thoughtStyle: style.id as AgentThinking['thoughtStyle'] }
                    })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      config.thinking.thoughtStyle === style.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-foreground-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{style.icon}</span>
                      <span className="text-sm font-medium">{style.name}</span>
                    </div>
                    <p className="text-xs text-foreground-muted">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium">Adaptive Learning</div>
                  <div className="text-xs text-foreground-muted">Learn from interactions</div>
                </div>
                <Toggle
                  checked={config.thinking.adaptiveLearning}
                  onChange={(checked) => updateConfig({
                    thinking: { ...config.thinking, adaptiveLearning: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium">Context Memory</div>
                  <div className="text-xs text-foreground-muted">Remember conversation context</div>
                </div>
                <Toggle
                  checked={config.thinking.contextMemory}
                  onChange={(checked) => updateConfig({
                    thinking: { ...config.thinking, contextMemory: checked }
                  })}
                />
              </div>
            </div>

            {/* Max Context Length */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Max Context Length: {config.thinking.maxContextLength.toLocaleString()} tokens</label>
              </div>
              <input
                type="range"
                min="1000"
                max="8000"
                step="500"
                value={config.thinking.maxContextLength}
                onChange={(e) => updateConfig({
                  thinking: { ...config.thinking, maxContextLength: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-foreground-muted mt-1">
                <span>1K</span>
                <span>4K</span>
                <span>8K</span>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Trading Config Section */}
        <SettingsSection
          icon={<TrendUpIcon className="w-5 h-5 text-green-400" />}
          title="Trading Config"
          description="Exchange, trading philosophy and risk management"
          expanded={expandedSections.has('trading')}
          onToggle={() => toggleSection('trading')}
        >
          <div className="space-y-4">
            {/* Preferred Exchange */}
            <div>
              <label className="text-sm font-medium mb-3 block">Preferred Exchange</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateConfig({
                    trading: { ...config.trading, preferredExchange: 'gmx' }
                  })}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    config.trading.preferredExchange === 'gmx'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-foreground-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendUpIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-semibold">GMX</span>
                  </div>
                  <p className="text-xs text-foreground-muted">Arbitrum & Avalanche DEX with deep liquidity</p>
                </button>
                <button
                  onClick={() => updateConfig({
                    trading: { ...config.trading, preferredExchange: 'hyperliquid' }
                  })}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    config.trading.preferredExchange === 'hyperliquid'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-foreground-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendUpIcon className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-semibold">Hyperliquid</span>
                    <CheckIcon className="w-4 h-4 text-success ml-auto" />
                  </div>
                  <p className="text-xs text-foreground-muted">High-performance L1 with no gas fees</p>
                </button>
              </div>
              <p className="text-xs text-foreground-muted mt-2">Select the exchange this agent will use for trading operations</p>
            </div>

            {/* Trading Style & Philosophy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Trading Style & Philosophy</label>
                <CopyIcon className="w-4 h-4 text-foreground-muted cursor-pointer hover:text-foreground" />
              </div>
              <textarea
                value={config.trading.tradingStyle}
                onChange={(e) => updateConfig({
                  trading: { ...config.trading, tradingStyle: e.target.value }
                })}
                placeholder="Describe the trading strategy and decision-making process..."
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-foreground-muted">Define trading strategies and decision-making process</span>
                <span className="text-xs text-foreground-muted">{config.trading.tradingStyle.length} characters</span>
              </div>
            </div>

            {/* Risk Tolerance */}
            <div>
              <label className="text-sm font-medium mb-3 block">Risk Tolerance</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'conservative', name: 'Conservative', desc: 'Low risk, steady approach', color: 'text-green-400' },
                  { id: 'moderate', name: 'Moderate', desc: 'Balanced risk/reward', color: 'text-yellow-400' },
                  { id: 'aggressive', name: 'Aggressive', desc: 'High risk, high reward', color: 'text-red-400' },
                ].map((risk) => (
                  <button
                    key={risk.id}
                    onClick={() => updateConfig({
                      trading: { ...config.trading, riskTolerance: risk.id as AgentTradingConfig['riskTolerance'] }
                    })}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      config.trading.riskTolerance === risk.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-foreground-muted'
                    }`}
                  >
                    <div className={`text-sm font-medium ${risk.color}`}>{risk.name}</div>
                    <p className="text-xs text-foreground-muted">{risk.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Management */}
            <div>
              <label className="text-sm font-medium mb-3 block">Risk Management</label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center">
                      <StopIcon className="w-4 h-4 text-error" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Enforce Stop Losses</div>
                      <div className="text-xs text-foreground-muted">Automatically calculate and enforce stop loss orders when the agent doesn&apos;t provide them</div>
                    </div>
                  </div>
                  <Toggle
                    checked={config.trading.enforceStopLosses}
                    onChange={(checked) => updateConfig({
                      trading: { ...config.trading, enforceStopLosses: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Enforce Take Profits</div>
                      <div className="text-xs text-foreground-muted">Automatically calculate and enforce take profit orders when the agent doesn&apos;t provide them</div>
                    </div>
                  </div>
                  <Toggle
                    checked={config.trading.enforceTakeProfits}
                    onChange={(checked) => updateConfig({
                      trading: { ...config.trading, enforceTakeProfits: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Social Engagement Section */}
        <SettingsSection
          icon={<UsersIcon className="w-5 h-5 text-orange-400" />}
          title="Social Engagement"
          description="Communication style and community interaction"
          expanded={expandedSections.has('social')}
          onToggle={() => toggleSection('social')}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Social Interaction Style</label>
                <CopyIcon className="w-4 h-4 text-foreground-muted cursor-pointer hover:text-foreground" />
              </div>
              <textarea
                value={config.social.interactionStyle}
                onChange={(e) => updateConfig({
                  social: { ...config.social, interactionStyle: e.target.value }
                })}
                placeholder="Describe community engagement and social media approach..."
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-foreground-muted">Define community engagement and social media approach</span>
                <span className="text-xs text-foreground-muted">{config.social.interactionStyle.length} characters</span>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Optimizations Section */}
        <SettingsSection
          icon={<SparklesIcon className="w-5 h-5 text-pink-400" />}
          title="Optimizations"
          description="Performance and cost optimization settings"
          expanded={expandedSections.has('optimizations')}
          onToggle={() => toggleSection('optimizations')}
        >
          <div className="space-y-4">
            <label className="text-sm font-medium block">Credit Usage Optimization</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium">Skip Final Chat Formatting</div>
                  <div className="text-xs text-foreground-muted">Save credits by skipping final output formatting and returning raw encoded response</div>
                </div>
                <Toggle
                  checked={config.optimizations.skipFinalChatFormatting}
                  onChange={(checked) => updateConfig({
                    optimizations: { ...config.optimizations, skipFinalChatFormatting: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium">Skip Step Completion Assessment</div>
                  <div className="text-xs text-foreground-muted">Save credits by skipping step completion assessment which uses the LLM to verify step completion and control retry logic for failed steps</div>
                </div>
                <Toggle
                  checked={config.optimizations.skipStepCompletionAssessment}
                  onChange={(checked) => updateConfig({
                    optimizations: { ...config.optimizations, skipStepCompletionAssessment: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium">Enable LLM Model Auto-Selection</div>
                  <div className="text-xs text-foreground-muted">Optimize costs by automatically selecting appropriate models for different tasks based on complexity</div>
                </div>
                <Toggle
                  checked={config.optimizations.enableModelAutoSelection}
                  onChange={(checked) => updateConfig({
                    optimizations: { ...config.optimizations, enableModelAutoSelection: checked }
                  })}
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Model Configuration Section */}
        <SettingsSection
          icon={<LayersIcon className="w-5 h-5 text-cyan-400" />}
          title="Model Configuration"
          description="Configure AI models for different tasks"
          expanded={expandedSections.has('models')}
          onToggle={() => toggleSection('models')}
        >
          <ModelSelector
            config={llmConfig}
            onConfigChange={updateLlmConfig}
            disabled={saving}
          />
        </SettingsSection>
      </div>

      {/* Save Changes Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 p-3 bg-card border-t border-border">
          <div className="flex items-center justify-between bg-warning/10 border border-warning/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <WarningIcon className="w-5 h-5 text-warning" />
              <div>
                <span className="text-sm font-medium text-warning">Unsaved Changes</span>
                <span className="text-xs text-warning/70 ml-2">You have unsaved configuration changes</span>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-success text-black rounded-lg text-sm font-medium hover:bg-success/90 disabled:opacity-50 transition-colors"
            >
              <SaveIcon className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Section Component
interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, description, expanded, onToggle, children }: SettingsSectionProps) {
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
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Toggle Component
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-foreground-muted/30'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// Icons
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
      <path d="M12 2a9 9 0 019 9c0 3.5-2 6.5-5 8v3H8v-3c-3-1.5-5-4.5-5-8a9 9 0 019-9z" />
      <path d="M12 2v6M9 6l3 2 3-2" />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
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

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}
