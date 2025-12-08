'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TradePanelProps {
  symbol: string;
  availableBalance: number;
  currentPrice: number;
  onTrade?: (order: TradeOrder) => void;
}

interface TradeOrder {
  side: 'long' | 'short';
  type: 'market' | 'limit';
  size: number;
  price?: number;
  leverage: number;
  tpsl?: {
    takeProfit?: number;
    stopLoss?: number;
  };
}

export function TradePanel({
  symbol,
  availableBalance,
  currentPrice,
  onTrade,
}: TradePanelProps) {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [leverage, setLeverage] = useState(20);
  const [showTpsl, setShowTpsl] = useState(false);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const leverageOptions = [1, 2, 5, 10, 20, 50, 75, 100];
  const sizePercentages = [25, 50, 75, 100];

  const handleSizePercentage = (percent: number) => {
    const maxSize = availableBalance * leverage * (percent / 100);
    setAmount(maxSize.toFixed(2));
  };

  const handleTrade = () => {
    if (!amount) return;

    const order: TradeOrder = {
      side,
      type: orderType,
      size: parseFloat(amount),
      leverage,
      ...(orderType === 'limit' && limitPrice ? { price: parseFloat(limitPrice) } : {}),
      ...(showTpsl && (takeProfit || stopLoss) ? {
        tpsl: {
          ...(takeProfit ? { takeProfit: parseFloat(takeProfit) } : {}),
          ...(stopLoss ? { stopLoss: parseFloat(stopLoss) } : {}),
        }
      } : {}),
    };

    onTrade?.(order);
  };

  const estimatedPnl = amount ? parseFloat(amount) * 0.01 * (side === 'long' ? 1 : -1) : 0;
  const liquidationPrice = amount
    ? currentPrice * (side === 'long' ? (1 - 1/leverage) : (1 + 1/leverage))
    : null;

  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Side Toggle */}
      <div className="grid grid-cols-2 p-1 m-3 bg-background rounded-lg">
        <button
          onClick={() => setSide('long')}
          className={`py-2.5 text-sm font-semibold rounded-md transition-all ${
            side === 'long'
              ? 'bg-success text-black'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={`py-2.5 text-sm font-semibold rounded-md transition-all ${
            side === 'short'
              ? 'bg-error text-white'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Short
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {/* Order Type */}
        <div className="flex gap-2 p-1 bg-background rounded-lg">
          <button
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              orderType === 'market'
                ? 'bg-card text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              orderType === 'limit'
                ? 'bg-card text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Limit
          </button>
        </div>

        {/* Leverage Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-foreground-muted">Leverage</span>
            <span className="text-sm font-semibold text-primary">{leverage}x</span>
          </div>
          <div className="flex gap-1.5">
            {leverageOptions.map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                  leverage === lev
                    ? 'bg-primary text-black'
                    : 'bg-background text-foreground-muted hover:bg-card'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price (if limit order) */}
        {orderType === 'limit' && (
          <div>
            <label className="text-xs text-foreground-muted mb-1.5 block">Limit Price</label>
            <div className="relative">
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={currentPrice.toLocaleString()}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle">
                USD
              </span>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-foreground-muted">Buy Amount</label>
            <span className="text-xs text-foreground-subtle">
              Available: <span className="text-foreground font-mono">{availableBalance.toFixed(2)} USDC</span>
            </span>
          </div>
          <div className="relative mb-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle">
              USDC
            </span>
          </div>
          <div className="flex gap-1.5">
            {sizePercentages.map((percent) => (
              <button
                key={percent}
                onClick={() => handleSizePercentage(percent)}
                className="flex-1 py-1.5 text-[11px] font-medium bg-background text-foreground-muted rounded hover:bg-card transition-colors"
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        {/* TP/SL Toggle */}
        <div>
          <button
            onClick={() => setShowTpsl(!showTpsl)}
            className="flex items-center gap-2 text-xs text-foreground-muted hover:text-foreground"
          >
            <div className={`w-4 h-4 rounded border ${showTpsl ? 'bg-primary border-primary' : 'border-border'} flex items-center justify-center`}>
              {showTpsl && <CheckIcon className="w-3 h-3 text-black" />}
            </div>
            TP/SL
          </button>

          {showTpsl && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[11px] text-foreground-subtle mb-1 block">Take Profit</label>
                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Price"
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-success"
                />
              </div>
              <div>
                <label className="text-[11px] text-foreground-subtle mb-1 block">Stop Loss</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Price"
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-error"
                />
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-2 p-3 bg-background rounded-lg text-xs">
          <div className="flex justify-between">
            <span className="text-foreground-muted">Available Margin</span>
            <span className="font-mono">{availableBalance.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Perps Account Value</span>
            <span className="font-mono">{availableBalance.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Current Position</span>
            <span className="font-mono">--</span>
          </div>
          {liquidationPrice && (
            <div className="flex justify-between">
              <span className="text-foreground-muted">Est. Liq. Price</span>
              <span className="font-mono text-warning">${liquidationPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Trade Button */}
      <div className="p-3 border-t border-border">
        <Button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0}
          className={`w-full py-3 text-sm font-semibold ${
            side === 'long'
              ? 'bg-success hover:bg-success/90 text-black'
              : 'bg-error hover:bg-error/90 text-white'
          }`}
        >
          {amount ? `${side === 'long' ? 'Long' : 'Short'} ${symbol}` : 'Add More Funds'}
        </Button>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
