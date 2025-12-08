'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAgents } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth';

// Template types
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  tasks: number;
  triggers: number;
  personality: string;
  strategy: string;
}

// Strategy templates
const agentTemplates: AgentTemplate[] = [
  {
    id: 'bollinger-band-range',
    name: 'Bollinger Band Range Trader',
    description: 'Trades mean reversion within Bollinger Bands. Executes longs at lower band and shorts at upper band in ranging markets.',
    tasks: 3,
    triggers: 8,
    personality: 'I am a professional and disciplined trading agent with a balanced approach to risk and reward. My demeanor is calm, analytical, and methodical. I maintain strict adherence to risk management protocols while seeking profitable opportunities in the crypto markets.',
    strategy: 'bollinger_bands',
  },
  {
    id: 'momentum',
    name: 'Momentum Trader',
    description: 'Follows strong price trends with tight risk management using MACD and RSI confirmation.',
    tasks: 2,
    triggers: 8,
    personality: 'I am an aggressive trend-follower focused on catching big moves. I use technical indicators to identify momentum and ride trends until exhaustion signals appear.',
    strategy: 'momentum',
  },
  {
    id: 'mean-reversion',
    name: 'RSI Mean Reversion',
    description: 'Captures short-term reversals by identifying extreme RSI levels across multiple timeframes.',
    tasks: 2,
    triggers: 8,
    personality: 'I am a precision-focused agent that identifies oversold and overbought conditions using RSI. I capitalize on mean reversion when RSI reaches extreme levels.',
    strategy: 'mean_reversion',
  },
  {
    id: 'ema-crossover',
    name: 'EMA Crossover Scalper',
    description: 'Fast-paced scalping using EMA12/EMA26 crossovers on 15m. Executes multiple quick trades.',
    tasks: 3,
    triggers: 0,
    personality: 'I am an aggressive scalping agent focused on capturing small, quick profits from EMA crossover signals. I trade frequently on short timeframes.',
    strategy: 'scalper',
  },
  {
    id: 'grid',
    name: 'Grid Trader',
    description: 'Places orders at fixed intervals to capture volatility in ranging markets.',
    tasks: 2,
    triggers: 4,
    personality: 'I am a systematic trader that profits from ranging markets. I place buy and sell orders at predetermined price levels to capture small moves.',
    strategy: 'grid',
  },
  {
    id: 'custom',
    name: 'Custom Strategy',
    description: 'Define your own trading personality and strategy from scratch.',
    tasks: 0,
    triggers: 0,
    personality: '',
    strategy: 'custom',
  },
];

const COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'OP', 'AVAX', 'DOGE', 'LINK'];

export default function NewAgentPage() {
  const router = useRouter();
  const { authenticated, login } = usePrivy();
  const { createAgent } = useAgents();

  const [step, setStep] = useState<'template' | 'config' | 'risk'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [approvedPairs, setApprovedPairs] = useState<string[]>(['BTC', 'ETH']);
  const [maxLeverage, setMaxLeverage] = useState(10);
  const [maxPositionSizeUsd, setMaxPositionSizeUsd] = useState(1000);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(20);
  const [llmProvider, setLlmProvider] = useState<'claude' | 'openai' | 'deepseek'>('claude');

  const handleSelectTemplate = (template: AgentTemplate) => {
    if (!authenticated) {
      login();
      return;
    }
    setSelectedTemplate(template);
    setName(template.id === 'custom' ? '' : `My ${template.name}`);
    setPersonality(template.personality);
    setStep('config');
  };

  const toggleCoin = (coin: string) => {
    setApprovedPairs(prev =>
      prev.includes(coin)
        ? prev.filter(c => c !== coin)
        : [...prev, coin]
    );
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !name || !personality) {
      setError('Please fill in all required fields');
      return;
    }

    if (approvedPairs.length === 0) {
      setError('Please select at least one trading pair');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const agent = await createAgent({
      name,
      personality,
      strategy: selectedTemplate.strategy,
      policies: {
        maxLeverage,
        maxPositionSizeUsd,
        maxPositionSizePct: 10,
        maxDrawdownPct,
        approvedPairs,
      },
      llmProvider,
    });

    setIsSubmitting(false);

    if (agent) {
      router.push(`/agents/${agent.id}`);
    } else {
      setError('Failed to create agent. Please try again.');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-56px)] bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <RobotIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Create New Agent</h1>
              <p className="text-foreground-muted text-sm">
                {step === 'template' && 'Choose a strategy template to get started'}
                {step === 'config' && 'Configure your agent personality and pairs'}
                {step === 'risk' && 'Set risk management parameters'}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {['template', 'config', 'risk'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? 'bg-primary text-black'
                      : ['template', 'config', 'risk'].indexOf(step) > i
                      ? 'bg-success text-black'
                      : 'bg-background-secondary text-foreground-muted'
                  }`}
                >
                  {['template', 'config', 'risk'].indexOf(step) > i ? <CheckIcon className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && (
                  <div className={`w-20 h-0.5 ${['template', 'config', 'risk'].indexOf(step) > i ? 'bg-success' : 'bg-background-secondary'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Template Selection */}
          {step === 'template' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agentTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="p-5 rounded-xl bg-card border border-border hover:border-primary text-left transition-all group"
                >
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{template.name}</h3>
                  <p className="text-sm text-foreground-muted mb-4 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded text-xs">
                      <TasksIcon className="w-3 h-3 text-warning" />
                      <span>{template.tasks} tasks</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded text-xs">
                      <TriggersIcon className="w-3 h-3 text-success" />
                      <span>{template.triggers} triggers</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 'config' && selectedTemplate && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Trading Agent"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Agent Personality</label>
                <textarea
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Describe how your agent should think and trade..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary resize-none"
                />
                <p className="text-xs text-foreground-subtle mt-1">This defines how the AI approaches trading decisions</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Trading Pairs</label>
                <div className="flex flex-wrap gap-2">
                  {COINS.map((coin) => (
                    <button
                      key={coin}
                      onClick={() => toggleCoin(coin)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        approvedPairs.includes(coin)
                          ? 'bg-primary text-black'
                          : 'bg-background-secondary text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">AI Model</label>
                <div className="flex gap-3">
                  {(['claude', 'openai', 'deepseek'] as const).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setLlmProvider(provider)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        llmProvider === provider
                          ? 'bg-primary text-black'
                          : 'bg-background-secondary text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {provider === 'claude' ? 'Claude' : provider === 'openai' ? 'GPT-4' : 'DeepSeek'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setStep('template')}
                  className="px-6 py-2 text-sm font-medium text-foreground-muted hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('risk')}
                  disabled={!name || !personality}
                  className="px-6 py-2 text-sm font-medium bg-primary text-black rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Risk Parameters */}
          {step === 'risk' && selectedTemplate && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Max Leverage</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={maxLeverage}
                    onChange={(e) => setMaxLeverage(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono text-foreground">{maxLeverage}x</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Max Position Size (USD)</label>
                <input
                  type="number"
                  value={maxPositionSizeUsd}
                  onChange={(e) => setMaxPositionSizeUsd(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Max Drawdown (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={maxDrawdownPct}
                    onChange={(e) => setMaxDrawdownPct(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono text-foreground">{maxDrawdownPct}%</span>
                </div>
                <p className="text-xs text-foreground-subtle mt-1">Agent pauses if losses exceed this</p>
              </div>

              {/* Summary */}
              <div className="bg-background rounded-lg p-4 border border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Name</span>
                    <span className="text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Strategy</span>
                    <span className="text-foreground">{selectedTemplate.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Pairs</span>
                    <span className="text-foreground">{approvedPairs.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">AI Model</span>
                    <span className="text-foreground capitalize">{llmProvider}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setStep('config')}
                  className="px-6 py-2 text-sm font-medium text-foreground-muted hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-medium bg-primary text-black rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Icons
function RobotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" strokeLinecap="round" />
      <line x1="16" y1="16" x2="16" y2="16" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function TriggersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
