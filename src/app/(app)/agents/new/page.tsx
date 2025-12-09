'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAgents } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth';

// Available models
const MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat V3.1', icon: '🌊' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', icon: '🟣' },
  { id: 'gpt-4o', name: 'GPT-4o', icon: '🟢' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '🟡' },
];

// Available trading pairs
const SYMBOLS = [
  { id: 'BTC', name: 'BTC/USDT' },
  { id: 'ETH', name: 'ETH/USDT' },
  { id: 'SOL', name: 'SOL/USDT' },
  { id: 'BNB', name: 'BNB/USDT' },
  { id: 'DOGE', name: 'DOGE/USDT' },
  { id: 'XRP', name: 'XRP/USDT' },
  { id: 'ARB', name: 'ARB/USDT' },
  { id: 'HYPE', name: 'HYPE/USDT' },
];

// Example prompts for placeholder
const EXAMPLE_PROMPTS = `EX:
"ANALYZE MARKET TRENDS AND OPEN POSITIONS ONLY WITH RSI < 30."
"ACT LIKE AN EXPERIENCED CRYPTO ANALYST EXPLAINING DECISIONS CLEARLY."
"FOCUS ON SAFE, LOW RISK TRADING WITH TIGHT STOP LOSSES."`;

function CreateAgentModal() {
  const router = useRouter();
  const { authenticated, login } = usePrivy();
  const { createAgent } = useAgents();

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

  // Validate invite code
  useEffect(() => {
    if (tradingMode === 'live' && inviteCode.length >= 4) {
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
  }, [inviteCode, tradingMode]);

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

    if (tradingMode === 'live' && !inviteCodeValid) {
      setError('Please enter a valid invite code for live trading');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const agent = await createAgent({
        name: name.trim(),
        prompt: prompt.trim() || undefined,
        isDemo: tradingMode === 'demo',
        inviteCode: tradingMode === 'live' ? inviteCode : undefined,
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
        setError('Failed to create agent. Please try again.');
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h1 className="text-lg font-semibold tracking-wide">CREATE AGENT</h1>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Trading Mode Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTradingMode('demo')}
                className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  tradingMode === 'demo'
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                <div>DEMO TRADING</div>
                <div className="text-xs opacity-70">(FREE FUND 5000U)</div>
              </button>
              <button
                onClick={() => setTradingMode('live')}
                className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  tradingMode === 'live'
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                <div>LIVE TRADING</div>
                <div className="text-xs opacity-70">(HYPERLIQUID)</div>
              </button>
            </div>

            {/* Invite Code Section (for live trading) */}
            {tradingMode === 'live' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setHasInviteCode(true)}
                    className={`py-2.5 px-4 rounded-lg text-xs font-medium transition-all ${
                      hasInviteCode
                        ? 'bg-primary/20 border-2 border-primary text-primary'
                        : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    I HAVE<br />INVITATION CODE
                  </button>
                  <button
                    onClick={() => setHasInviteCode(false)}
                    className={`py-2.5 px-4 rounded-lg text-xs font-medium transition-all ${
                      !hasInviteCode
                        ? 'bg-primary/20 border-2 border-primary text-primary'
                        : 'bg-background-secondary border-2 border-transparent text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    I DO NOT HAVE<br />INVITATION CODE
                  </button>
                </div>

                {hasInviteCode ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm text-foreground-muted">Invitation Code*</label>
                      <HelpIcon className="w-4 h-4 text-foreground-subtle" />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="ENTER INVITATION CODE"
                        className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none uppercase tracking-wider ${
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
                      <p className="text-xs text-error mt-1">{inviteCodeError}</p>
                    )}
                    {inviteCodeValid && (
                      <p className="text-xs text-success mt-1">Valid invitation code</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning">
                      An invitation code is required for live trading. Join our Discord to request one.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Agent Name */}
            <div>
              <label className="text-sm text-foreground-muted mb-2 block">Agent Name*</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="ENTER AGENT NAME"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary uppercase tracking-wider"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle">
                  {name.length}/20
                </span>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-sm text-foreground-muted mb-2 block">Select Model*</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
                >
                  {MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.icon} {model.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted pointer-events-none" />
              </div>
            </div>

            {/* Symbol Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-foreground-muted">Select Symbol*</label>
                <button
                  onClick={selectAllSymbols}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                    selectedSymbols.length === SYMBOLS.length ? 'bg-primary border-primary' : 'border-foreground-muted'
                  }`}>
                    {selectedSymbols.length === SYMBOLS.length && <CheckIcon className="w-3 h-3 text-black" />}
                  </div>
                  Select All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SYMBOLS.map((symbol) => (
                  <button
                    key={symbol.id}
                    onClick={() => toggleSymbol(symbol.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedSymbols.includes(symbol.id)
                        ? 'bg-primary/20 border border-primary text-primary'
                        : 'bg-background-secondary border border-transparent text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {symbol.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Design */}
            <div>
              <label className="text-sm text-foreground-muted mb-2 block">Prompt Design (Optional)</label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                  placeholder={EXAMPLE_PROMPTS}
                  rows={5}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary resize-none text-sm"
                />
                <span className="absolute right-3 bottom-3 text-xs text-foreground-subtle">
                  {prompt.length}/1000
                </span>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
            >
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced Settings
            </button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-background rounded-lg border border-border">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-foreground-muted">Max Leverage</label>
                    <span className="text-sm font-mono text-foreground">{maxLeverage}x</span>
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-foreground-muted">Max Position Size (USD)</label>
                    <span className="text-sm font-mono text-foreground">${maxPositionSize}</span>
                  </div>
                  <input
                    type="number"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-foreground-muted">Max Drawdown</label>
                    <span className="text-sm font-mono text-foreground">{maxDrawdown}%</span>
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
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (tradingMode === 'live' && !inviteCodeValid)}
              className="w-full py-3.5 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all tracking-wide"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE AGENT'}
            </button>
            <p className="text-xs text-center text-foreground-subtle mt-3">
              AGENTS PAUSE AUTOMATICALLY AFTER 3 DAYS OF NO LOGIN ACTIVITY.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default CreateAgentModal;

// Icons
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
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
