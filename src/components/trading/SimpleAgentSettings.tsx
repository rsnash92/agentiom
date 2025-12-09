'use client';

import { useState, useEffect } from 'react';
import { useAgent } from '@/lib/hooks';

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

export function SimpleAgentSettings({ agentId, onClose }: SimpleAgentSettingsProps) {
  const { agent, updateAgent, executeOnce } = useAgent(agentId);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL']);
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<string | null>(null);

  // Load agent data
  useEffect(() => {
    if (agent) {
      setSelectedSymbols(agent.policies?.approvedPairs || ['BTC', 'ETH', 'SOL']);
      setPrompt(agent.personality || '');
    }
  }, [agent]);

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
        policies: {
          ...agent.policies,
          approvedPairs: selectedSymbols,
        },
      });
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
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
              className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2.5 sm:py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-primary resize-none text-xs sm:text-sm"
            />
            <span className="absolute bottom-2 right-2 text-[10px] sm:text-xs text-foreground-subtle">
              {prompt.length}/1000
            </span>
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
