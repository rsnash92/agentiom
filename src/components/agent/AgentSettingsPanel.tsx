'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks';
import { ModelSelector } from './ModelSelector';
import { AgentLLMConfig, DEFAULT_LLM_CONFIG } from '@/lib/llm/types';
import {
  Fieldset,
  FormSelect,
  CollapsibleSection,
  SegmentedControl,
  Checkbox,
  RangeSlider,
  ActionButton,
} from '@/components/ui/trading-form';

// Types for agent configuration
export interface AgentPersonality {
  description: string;
  communicationTone: 'professional' | 'casual' | 'technical' | 'friendly';
  responseLength: 'concise' | 'balanced' | 'detailed';
  creativityLevel: number;
}

export interface AgentThinking {
  thoughtStyle: 'chain' | 'graph' | 'tree' | 'reflection';
  adaptiveLearning: boolean;
  contextMemory: boolean;
  maxContextLength: number;
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

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'friendly', label: 'Friendly' },
];

const LENGTH_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

const THOUGHT_STYLES = [
  { value: 'chain', label: 'Chain' },
  { value: 'graph', label: 'Graph' },
  { value: 'tree', label: 'Tree' },
  { value: 'reflection', label: 'Reflect' },
];

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
];

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
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const { getAccessToken } = useAuth();

  const updateConfig = useCallback((updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const updateLlmConfig = useCallback((newConfig: AgentLLMConfig) => {
    setLlmConfig(newConfig);
    setHasChanges(true);
  }, []);

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
    <div className="flex flex-col h-full bg-background">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Core Personality */}
        <CollapsibleSection title="Core Personality" defaultOpen>
          <div className="space-y-4">
            <Fieldset label="Personality Description">
              <textarea
                value={config.personality.description}
                onChange={(e) => updateConfig({
                  personality: { ...config.personality, description: e.target.value }
                })}
                placeholder="Describe the agent's personality..."
                className="w-full h-32 bg-transparent text-sm font-mono resize-none focus:outline-none"
              />
            </Fieldset>

            <div className="grid grid-cols-2 gap-3">
              <Fieldset label="Communication Tone">
                <SegmentedControl
                  options={TONE_OPTIONS}
                  value={config.personality.communicationTone}
                  onChange={(v) => updateConfig({
                    personality: { ...config.personality, communicationTone: v as AgentPersonality['communicationTone'] }
                  })}
                />
              </Fieldset>
              <Fieldset label="Response Length">
                <SegmentedControl
                  options={LENGTH_OPTIONS}
                  value={config.personality.responseLength}
                  onChange={(v) => updateConfig({
                    personality: { ...config.personality, responseLength: v as AgentPersonality['responseLength'] }
                  })}
                />
              </Fieldset>
            </div>

            <Fieldset label={`Creativity Level: ${config.personality.creativityLevel}%`}>
              <RangeSlider
                value={config.personality.creativityLevel}
                onChange={(v) => updateConfig({
                  personality: { ...config.personality, creativityLevel: v }
                })}
                min={0}
                max={100}
                showTicks
              />
              <div className="flex justify-between text-[10px] text-foreground-muted mt-2 px-1">
                <span>Conservative</span>
                <span>Balanced</span>
                <span>Creative</span>
              </div>
            </Fieldset>
          </div>
        </CollapsibleSection>

        {/* Thinking & Learning */}
        <CollapsibleSection title="Thinking & Learning" defaultOpen={false}>
          <div className="space-y-4">
            <Fieldset label="Thought Style">
              <SegmentedControl
                options={THOUGHT_STYLES}
                value={config.thinking.thoughtStyle}
                onChange={(v) => updateConfig({
                  thinking: { ...config.thinking, thoughtStyle: v as AgentThinking['thoughtStyle'] }
                })}
              />
            </Fieldset>

            <div className="flex items-center gap-4">
              <Checkbox
                label="Adaptive Learning"
                checked={config.thinking.adaptiveLearning}
                onChange={(c) => updateConfig({
                  thinking: { ...config.thinking, adaptiveLearning: c }
                })}
              />
              <Checkbox
                label="Context Memory"
                checked={config.thinking.contextMemory}
                onChange={(c) => updateConfig({
                  thinking: { ...config.thinking, contextMemory: c }
                })}
              />
            </div>

            <Fieldset label={`Max Context: ${config.thinking.maxContextLength.toLocaleString()} tokens`}>
              <RangeSlider
                value={config.thinking.maxContextLength}
                onChange={(v) => updateConfig({
                  thinking: { ...config.thinking, maxContextLength: v }
                })}
                min={1000}
                max={8000}
                step={500}
                showTicks
              />
              <div className="flex justify-between text-[10px] text-foreground-muted mt-2 px-1">
                <span>1K</span>
                <span>4K</span>
                <span>8K</span>
              </div>
            </Fieldset>
          </div>
        </CollapsibleSection>

        {/* Trading Config */}
        <CollapsibleSection title="Trading Config" defaultOpen={false}>
          <div className="space-y-4">
            <Fieldset label="Preferred Exchange">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateConfig({
                    trading: { ...config.trading, preferredExchange: 'gmx' }
                  })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    config.trading.preferredExchange === 'gmx'
                      ? 'border-primary bg-primary/10'
                      : 'border-border/60 bg-transparent hover:border-foreground-muted'
                  }`}
                >
                  <div className="text-sm font-medium">GMX</div>
                  <div className="text-[10px] text-foreground-muted">Arbitrum & Avalanche DEX</div>
                </button>
                <button
                  onClick={() => updateConfig({
                    trading: { ...config.trading, preferredExchange: 'hyperliquid' }
                  })}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    config.trading.preferredExchange === 'hyperliquid'
                      ? 'border-primary bg-primary/10'
                      : 'border-border/60 bg-transparent hover:border-foreground-muted'
                  }`}
                >
                  <div className="text-sm font-medium">Hyperliquid</div>
                  <div className="text-[10px] text-foreground-muted">High-performance L1</div>
                </button>
              </div>
            </Fieldset>

            <Fieldset label="Trading Strategy">
              <textarea
                value={config.trading.tradingStyle}
                onChange={(e) => updateConfig({
                  trading: { ...config.trading, tradingStyle: e.target.value }
                })}
                placeholder="Describe trading strategy..."
                className="w-full h-24 bg-transparent text-sm font-mono resize-none focus:outline-none"
              />
            </Fieldset>

            <Fieldset label="Risk Tolerance">
              <SegmentedControl
                options={RISK_OPTIONS}
                value={config.trading.riskTolerance}
                onChange={(v) => updateConfig({
                  trading: { ...config.trading, riskTolerance: v as AgentTradingConfig['riskTolerance'] }
                })}
              />
            </Fieldset>

            <div className="flex items-center gap-4">
              <Checkbox
                label="Enforce Stop Losses"
                checked={config.trading.enforceStopLosses}
                onChange={(c) => updateConfig({
                  trading: { ...config.trading, enforceStopLosses: c }
                })}
              />
              <Checkbox
                label="Enforce Take Profits"
                checked={config.trading.enforceTakeProfits}
                onChange={(c) => updateConfig({
                  trading: { ...config.trading, enforceTakeProfits: c }
                })}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Social Engagement */}
        <CollapsibleSection title="Social Engagement" defaultOpen={false}>
          <Fieldset label="Interaction Style">
            <textarea
              value={config.social.interactionStyle}
              onChange={(e) => updateConfig({
                social: { ...config.social, interactionStyle: e.target.value }
              })}
              placeholder="Describe social interaction approach..."
              className="w-full h-24 bg-transparent text-sm font-mono resize-none focus:outline-none"
            />
          </Fieldset>
        </CollapsibleSection>

        {/* Optimizations */}
        <CollapsibleSection title="Optimizations" defaultOpen={false}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
              <div>
                <div className="text-xs font-medium">Skip Final Chat Formatting</div>
                <div className="text-[10px] text-foreground-muted">Save credits by skipping output formatting</div>
              </div>
              <Toggle
                checked={config.optimizations.skipFinalChatFormatting}
                onChange={(c) => updateConfig({
                  optimizations: { ...config.optimizations, skipFinalChatFormatting: c }
                })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
              <div>
                <div className="text-xs font-medium">Skip Step Completion</div>
                <div className="text-[10px] text-foreground-muted">Skip step completion assessment</div>
              </div>
              <Toggle
                checked={config.optimizations.skipStepCompletionAssessment}
                onChange={(c) => updateConfig({
                  optimizations: { ...config.optimizations, skipStepCompletionAssessment: c }
                })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
              <div>
                <div className="text-xs font-medium">Model Auto-Selection</div>
                <div className="text-[10px] text-foreground-muted">Auto-select models based on task</div>
              </div>
              <Toggle
                checked={config.optimizations.enableModelAutoSelection}
                onChange={(c) => updateConfig({
                  optimizations: { ...config.optimizations, enableModelAutoSelection: c }
                })}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Model Configuration */}
        <CollapsibleSection title="Model Configuration" defaultOpen={false}>
          <ModelSelector
            config={llmConfig}
            onConfigChange={updateLlmConfig}
            disabled={saving}
          />
        </CollapsibleSection>
      </div>

      {/* Save Bar */}
      {hasChanges && (
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg mb-3">
            <WarningIcon className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-xs text-warning">Unsaved changes</span>
          </div>
          <ActionButton
            variant="success"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </ActionButton>
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
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-primary' : 'bg-foreground-muted/30'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
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
