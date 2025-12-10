'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAgents } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth';
import { AgentTemplateSelector } from '@/components/agent/AgentTemplateSelector';
import type { AgentTemplate } from '@/config/agent-templates';

// Available models
const MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat V3.1', icon: '🌊' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', icon: '🟣' },
  { id: 'gpt-4o', name: 'GPT-4o', icon: '🟢' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '🟡' },
];

// Available trading pairs (matching screenshot)
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

// Example prompts for placeholder
const EXAMPLE_PROMPTS = `EX:
"ANALYZE MARKET TRENDS AND OPEN POSITIONS ONLY WITH RSI < 30."
"ACT LIKE AN EXPERIENCED CRYPTO ANALYST EXPLAINING DECISIONS CLEARLY."
"FOCUS ON SAFE, LOW RISK TRADING WITH TIGHT STOP LOSSES."`;

type CreationStep = 'template' | 'configure';

function CreateAgentPage() {
  const router = useRouter();
  const { authenticated, login } = usePrivy();
  const { createAgent, error: agentError } = useAgents();

  // Flow state
  const [step, setStep] = useState<CreationStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  // Form state
  const [tradingMode, setTradingMode] = useState<'demo' | 'live'>('demo');
  const [hasInviteCode, setHasInviteCode] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [name, setName] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL']);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings
  const [maxLeverage, setMaxLeverage] = useState(10);
  const [maxPositionSize, setMaxPositionSize] = useState(1000);
  const [maxDrawdown, setMaxDrawdown] = useState(20);

  // Suppress unused variable warning
  void isValidatingCode;

  // Apply template settings when selected
  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);

    // Pre-fill form with template values
    setName(template.name);
    setPrompt(template.config.personality);
    setSelectedSymbols(template.config.approvedPairs);
    setMaxLeverage(template.config.policies.maxLeverage);
    setMaxPositionSize(template.config.policies.maxPositionSizeUsd);
    setMaxDrawdown(template.config.policies.maxDrawdownPct);

    // Set model if specified
    if (template.config.llmConfig?.primaryModel) {
      setSelectedModel(template.config.llmConfig.primaryModel);
    }

    setStep('configure');
  };

  const handleSkipTemplate = () => {
    setSelectedTemplate(null);
    setStep('configure');
  };

  // Validate invite code (required for both demo and live)
  useEffect(() => {
    if (inviteCode.length >= 4) {
      const validateCode = async () => {
        setIsValidatingCode(true);
        setInviteCodeError(null);
        try {
          const response = await fetch('/api/invite-codes/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode }),
          });
          const data = await response.json();
          setInviteCodeValid(data.valid);
          if (!data.valid) {
            setInviteCodeError(data.error);
          }
        } catch {
          setInviteCodeValid(false);
          setInviteCodeError('Failed to validate code');
        } finally {
          setIsValidatingCode(false);
        }
      };
      const timeout = setTimeout(validateCode, 500);
      return () => clearTimeout(timeout);
    } else {
      setInviteCodeValid(null);
      setInviteCodeError(null);
    }
  }, [inviteCode]);

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const selectAllSymbols = () => {
    if (selectedSymbols.length === SYMBOLS.length) {
      setSelectedSymbols([]);
    } else {
      setSelectedSymbols(SYMBOLS.map(s => s.id));
    }
  };

  const handleSubmit = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!name.trim()) {
      setError('Please enter an agent name');
      return;
    }

    if (selectedSymbols.length === 0) {
      setError('Please select at least one trading pair');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const agent = await createAgent({
        name: name.trim(),
        prompt: prompt.trim() || undefined,
        isDemo: tradingMode === 'demo',
        inviteCode: inviteCode,
        model: selectedModel,
        approvedPairs: selectedSymbols,
        policies: {
          maxLeverage,
          maxPositionSizeUsd: maxPositionSize,
          maxPositionSizePct: 10,
          maxDrawdownPct: maxDrawdown,
          approvedPairs: selectedSymbols,
        },
      });

      if (agent) {
        router.push(`/agents/${agent.id}`);
      } else {
        setError(agentError || 'Failed to create agent. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    router.push('/agents');
  };

  const handleBackToTemplates = () => {
    setStep('template');
  };

  // Template Selection Step
  if (step === 'template') {
    return (
      <ProtectedRoute>
        <AgentTemplateSelector
          onSelect={handleTemplateSelect}
          onSkip={handleSkipTemplate}
        />
      </ProtectedRoute>
    );
  }

  // Configure Agent Step
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-lg bg-card border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden my-2 sm:my-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToTemplates}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-semibold tracking-wide">CREATE AGENT</h1>
                {selectedTemplate && (
                  <p className="text-xs text-primary">Template: {selectedTemplate.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Template Banner (if using template) */}
            {selectedTemplate && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <TemplateIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-primary font-medium">Using Template: {selectedTemplate.name}</p>
                    <p className="text-xs text-primary/70 mt-0.5">
                      Pre-configured with {selectedTemplate.goals.length} goals. You can customize below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Mode Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTradingMode('demo')}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  tradingMode === 'demo'
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                <div>DEMO TRADING</div>
                <div className="text-[10px] sm:text-xs opacity-70">(FREE 5000U)</div>
              </button>
              <button
                onClick={() => setTradingMode('live')}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  tradingMode === 'live'
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                <div>LIVE TRADING</div>
                <div className="text-[10px] sm:text-xs opacity-70">(HYPERLIQUID)</div>
              </button>
            </div>

            {/* Invite Code Section (required for both demo and live) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHasInviteCode(true)}
                className={`py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  hasInviteCode
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                I HAVE<br />INVITE CODE
              </button>
              <button
                onClick={() => setHasInviteCode(false)}
                className={`py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  !hasInviteCode
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                NO INVITE<br />CODE
              </button>
            </div>

            {hasInviteCode ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs sm:text-sm text-foreground-muted">Invitation Code (optional)</label>
                  <HelpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground-subtle" />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-background border rounded-lg text-sm sm:text-base text-foreground placeholder:text-foreground-subtle focus:outline-none uppercase tracking-wider ${
                      inviteCodeValid === true
                        ? 'border-success'
                        : inviteCodeValid === false
                        ? 'border-error'
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                    <CopyIcon className="w-4 h-4" />
                  </button>
                </div>
                {inviteCodeError && (
                  <p className="text-[10px] sm:text-xs text-error mt-1">{inviteCodeError}</p>
                )}
                {inviteCodeValid && (
                  <p className="text-[10px] sm:text-xs text-success mt-1">Valid invitation code</p>
                )}
              </div>
            ) : (
              <div className="p-3 sm:p-4 bg-foreground-subtle/10 border border-foreground-subtle/20 rounded-lg">
                <p className="text-xs sm:text-sm text-foreground-muted">
                  Invite codes disabled during development.
                </p>
              </div>
            )}

            {/* Agent Name */}
            <div>
              <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block">Agent Name*</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 30))}
                  placeholder="ENTER AGENT NAME"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-border rounded-lg text-sm sm:text-base text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary uppercase tracking-wider"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-foreground-subtle">
                  {name.length}/30
                </span>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block">Select Model*</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-border rounded-lg text-sm sm:text-base text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
                >
                  {MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.icon} {model.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground-muted pointer-events-none" />
              </div>
            </div>

            {/* Symbol Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="text-xs sm:text-sm text-foreground-muted">Select Symbol*</label>
                <button
                  onClick={selectAllSymbols}
                  className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-primary hover:text-primary/80"
                >
                  <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 border rounded flex items-center justify-center ${
                    selectedSymbols.length === SYMBOLS.length ? 'bg-primary border-primary' : 'border-foreground-muted'
                  }`}>
                    {selectedSymbols.length === SYMBOLS.length && <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />}
                  </div>
                  Select All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {SYMBOLS.map((symbol) => (
                  <button
                    key={symbol.id}
                    onClick={() => toggleSymbol(symbol.id)}
                    className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      selectedSymbols.includes(symbol.id)
                        ? 'bg-primary/20 border border-primary text-primary'
                        : 'bg-background-secondary border border-transparent text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {symbol.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Design */}
            <div>
              <label className="text-xs sm:text-sm text-foreground-muted mb-1.5 sm:mb-2 block">
                Prompt Design {selectedTemplate ? '(Template Applied)' : '(Optional)'}
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                  placeholder={EXAMPLE_PROMPTS}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary resize-none text-xs sm:text-sm"
                />
                <span className="absolute right-3 bottom-2 sm:bottom-3 text-[10px] sm:text-xs text-foreground-subtle">
                  {prompt.length}/1000
                </span>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs sm:text-sm text-foreground-muted hover:text-foreground"
            >
              <ChevronDownIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced Settings
              {selectedTemplate && <span className="text-primary text-xs">(From Template)</span>}
            </button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-background rounded-lg border border-border">
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <label className="text-xs sm:text-sm text-foreground-muted">Max Leverage</label>
                    <span className="text-xs sm:text-sm font-mono text-foreground">{maxLeverage}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={maxLeverage}
                    onChange={(e) => setMaxLeverage(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <label className="text-xs sm:text-sm text-foreground-muted">Max Position (USD)</label>
                    <span className="text-xs sm:text-sm font-mono text-foreground">${maxPositionSize}</span>
                  </div>
                  <input
                    type="number"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                    className="w-full px-3 sm:px-4 py-2 bg-background-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <label className="text-xs sm:text-sm text-foreground-muted">Max Drawdown</label>
                    <span className="text-xs sm:text-sm font-mono text-foreground">{maxDrawdown}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-2.5 sm:p-3 bg-error/10 border border-error/20 rounded-lg text-xs sm:text-sm text-error">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 sm:py-3.5 bg-primary text-black text-sm sm:text-base font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all tracking-wide"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE AGENT'}
            </button>
            <p className="text-[10px] sm:text-xs text-center text-foreground-subtle mt-2 sm:mt-3">
              AGENTS PAUSE AFTER 3 DAYS OF NO LOGIN.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default CreateAgentPage;

// Icons
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}
