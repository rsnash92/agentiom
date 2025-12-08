'use client';

import { useState } from 'react';

interface CreatePositionPanelProps {
  currentPrice?: number;
  symbol?: string;
  balance?: number;
}

const LEVERAGE_PRESETS = [2, 5, 10, 25];

export function CreatePositionPanel({
  currentPrice = 89319.5,
  symbol = 'BTC/USD',
  balance = 0,
}: CreatePositionPanelProps) {
  const [direction, setDirection] = useState<'long' | 'short' | 'swap'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(2);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('isolated');
  const [stopLoss, setStopLoss] = useState(false);
  const [takeProfit, setTakeProfit] = useState(false);
  const [showExecutionDetails, setShowExecutionDetails] = useState(false);

  const getRiskLevel = (lev: number) => {
    if (lev <= 2) return { label: 'LOW RISK', color: 'text-success', bg: 'bg-success/10' };
    if (lev <= 5) return { label: 'MEDIUM RISK', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'HIGH RISK', color: 'text-error', bg: 'bg-error/10' };
  };

  const risk = getRiskLevel(leverage);

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
          <PlusCircleIcon className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Create Position</h3>
          <p className="text-xs text-foreground-muted">Create new positions manually for your agent</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Direction & Order Type Card */}
        <div className="m-3 p-4 bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-xl border border-border/50">
          {/* Direction Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setDirection('long')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                direction === 'long'
                  ? 'bg-success text-black'
                  : 'bg-card/50 text-foreground-muted hover:text-foreground'
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setDirection('short')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                direction === 'short'
                  ? 'bg-error text-white'
                  : 'bg-card/50 text-foreground-muted hover:text-foreground'
              }`}
            >
              Short
            </button>
            <button
              onClick={() => setDirection('swap')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                direction === 'swap'
                  ? 'bg-primary text-black'
                  : 'bg-card/50 text-foreground-subtle hover:text-foreground-muted'
              }`}
            >
              Swap
            </button>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOrderType('market')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                orderType === 'market'
                  ? 'bg-blue-500 text-white'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                orderType === 'limit'
                  ? 'bg-blue-500 text-white'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Limit
            </button>
            <button className="p-1.5 text-foreground-muted hover:text-foreground transition-colors ml-auto">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pay Section */}
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground-muted">Pay</span>
            <span className="text-sm text-foreground-muted">Balance: ${balance.toFixed(2)} USDC</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-lg font-mono focus:outline-none"
            />
            <button className="text-sm text-foreground-muted hover:text-foreground transition-colors">
              MAX
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-md">
              <span className="text-sm font-medium">USDC</span>
              <ChevronDownIcon className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Long/Short Asset Section */}
        <div className="px-4 mb-4">
          <div className="text-sm text-foreground-muted text-center mb-2">
            {direction === 'long' ? 'Long' : direction === 'short' ? 'Short' : 'Swap'}
          </div>
          <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
            <span className="text-base font-medium">{symbol}</span>
            <button className="flex items-center gap-1.5 text-primary">
              <span className="font-mono">${currentPrice.toLocaleString()}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Leverage Section */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground-muted">Leverage: {leverage}.0x</span>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${risk.bg} ${risk.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {risk.label}
            </span>
          </div>

          {/* Slider */}
          <div className="relative mb-3">
            <input
              type="range"
              min="1"
              max="50"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {LEVERAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setLeverage(preset)}
                className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                  leverage === preset
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-border text-foreground-muted hover:border-foreground-muted'
                }`}
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>

        {/* Margin Mode */}
        <div className="px-4 mb-4">
          <div className="text-sm text-foreground-muted text-center mb-2">Margin Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMarginMode('cross')}
              className={`py-3 rounded-lg border transition-colors ${
                marginMode === 'cross'
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-border text-foreground-muted hover:border-foreground-muted'
              }`}
            >
              <div className="text-sm font-medium">Cross</div>
              <div className="text-xs opacity-70">Shares margin</div>
            </button>
            <button
              onClick={() => setMarginMode('isolated')}
              className={`py-3 rounded-lg border transition-colors ${
                marginMode === 'isolated'
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-border text-foreground-muted hover:border-foreground-muted'
              }`}
            >
              <div className="text-sm font-medium">Isolated</div>
              <div className="text-xs opacity-70">Position isolated</div>
            </button>
          </div>
        </div>

        {/* Pool Info */}
        <div className="mx-4 mb-4 p-3 bg-card rounded-lg border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-foreground-muted">Pool</span>
            <span className="text-sm font-medium">USDC-USDC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-muted">Collateral In</span>
            <span className="text-sm font-medium">USDC</span>
          </div>
        </div>

        {/* Stop Loss / Take Profit */}
        <div className="px-4 mb-4 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stopLoss}
              onChange={(e) => setStopLoss(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-transparent"
            />
            <StopLossIcon className="w-4 h-4 text-error" />
            <span className="text-sm font-medium text-error">Stop Loss</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={takeProfit}
              onChange={(e) => setTakeProfit(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-transparent"
            />
            <TakeProfitIcon className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">Take Profit</span>
          </label>
        </div>

        {/* Execution Details */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowExecutionDetails(!showExecutionDetails)}
            className="flex items-center justify-between w-full py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <span>Execution Details</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showExecutionDetails ? 'rotate-180' : ''}`} />
          </button>
          {showExecutionDetails && (
            <div className="mt-2 p-3 bg-card rounded-lg border border-border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Entry Price</span>
                <span>${currentPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Liquidation Price</span>
                <span>--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Fees</span>
                <span>--</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-border">
        <button
          disabled={!amount}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
            amount
              ? direction === 'long'
                ? 'bg-success text-black hover:bg-success/90'
                : direction === 'short'
                ? 'bg-error text-white hover:bg-error/90'
                : 'bg-primary text-black hover:bg-primary/90'
              : 'bg-card text-foreground-muted cursor-not-allowed'
          }`}
        >
          {amount ? `${direction === 'long' ? 'Long' : direction === 'short' ? 'Short' : 'Swap'} ${symbol}` : 'Enter an amount'}
        </button>
      </div>
    </div>
  );
}

// Icons
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function StopLossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function TakeProfitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
