'use client';

import { useState } from 'react';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookProps {
  symbol: string;
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  lastPrice: number;
  spread: number;
  spreadPercent: number;
}

type ViewMode = 'both' | 'bids' | 'asks';

export function OrderBook({
  symbol,
  asks,
  bids,
  lastPrice,
  spread,
  spreadPercent,
}: OrderBookProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [precision, setPrecision] = useState(1);

  const maxTotal = Math.max(
    ...asks.map((a) => a.total),
    ...bids.map((b) => b.total)
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Order Book</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('both')}
            className={`p-1 rounded ${viewMode === 'both' ? 'bg-card text-foreground' : 'text-foreground-muted hover:text-foreground'}`}
            title="Show both"
          >
            <BothIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('bids')}
            className={`p-1 rounded ${viewMode === 'bids' ? 'bg-card text-success' : 'text-foreground-muted hover:text-success'}`}
            title="Show bids only"
          >
            <BidsIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('asks')}
            className={`p-1 rounded ${viewMode === 'asks' ? 'bg-card text-error' : 'text-foreground-muted hover:text-error'}`}
            title="Show asks only"
          >
            <AsksIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <select
            value={precision}
            onChange={(e) => setPrecision(Number(e.target.value))}
            className="bg-card border border-border rounded px-1.5 py-0.5 text-xs text-foreground-muted"
          >
            <option value={0.1}>0.1</option>
            <option value={1}>1</option>
            <option value={10}>10</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[11px] text-foreground-subtle border-b border-border">
        <span>Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total (USD)</span>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (sells) */}
        {(viewMode === 'both' || viewMode === 'asks') && (
          <div className={`overflow-y-auto ${viewMode === 'both' ? 'flex-1' : 'flex-1'}`}>
            <div className="flex flex-col-reverse">
              {asks.slice(0, viewMode === 'both' ? 12 : 24).map((ask, i) => (
                <OrderBookRow
                  key={`ask-${i}`}
                  price={ask.price}
                  size={ask.size}
                  total={ask.total}
                  maxTotal={maxTotal}
                  side="ask"
                />
              ))}
            </div>
          </div>
        )}

        {/* Spread / Last Price */}
        {viewMode === 'both' && (
          <div className="flex items-center justify-between px-3 py-2 border-y border-border bg-background">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono">${lastPrice.toLocaleString()}</span>
              <span className="text-xs text-foreground-subtle">Mark</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-foreground-muted">
                Spread: <span className="font-mono">${spread.toFixed(2)}</span>
                <span className="text-foreground-subtle ml-1">({spreadPercent.toFixed(3)}%)</span>
              </span>
            </div>
          </div>
        )}

        {/* Bids (buys) */}
        {(viewMode === 'both' || viewMode === 'bids') && (
          <div className={`overflow-y-auto ${viewMode === 'both' ? 'flex-1' : 'flex-1'}`}>
            {bids.slice(0, viewMode === 'both' ? 12 : 24).map((bid, i) => (
              <OrderBookRow
                key={`bid-${i}`}
                price={bid.price}
                size={bid.size}
                total={bid.total}
                maxTotal={maxTotal}
                side="bid"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderBookRowProps {
  price: number;
  size: number;
  total: number;
  maxTotal: number;
  side: 'ask' | 'bid';
}

function OrderBookRow({ price, size, total, maxTotal, side }: OrderBookRowProps) {
  const percentage = (total / maxTotal) * 100;
  const bgColor = side === 'bid' ? 'bg-success/10' : 'bg-error/10';
  const textColor = side === 'bid' ? 'text-success' : 'text-error';

  return (
    <div className="relative grid grid-cols-3 px-3 py-1 text-xs font-mono hover:bg-card/50 cursor-pointer group">
      {/* Depth visualization */}
      <div
        className={`absolute inset-y-0 ${side === 'bid' ? 'right-0' : 'right-0'} ${bgColor}`}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <span className={`relative z-10 ${textColor}`}>{price.toLocaleString()}</span>
      <span className="relative z-10 text-right text-foreground">{size.toLocaleString()}</span>
      <span className="relative z-10 text-right text-foreground-muted">{total.toLocaleString()}</span>
    </div>
  );
}

// Icons
function BothIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="4" rx="1" />
      <rect x="4" y="10" width="16" height="4" rx="1" />
      <rect x="4" y="16" width="16" height="4" rx="1" />
    </svg>
  );
}

function BidsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="14" width="16" height="3" rx="1" />
      <rect x="4" y="18" width="16" height="3" rx="1" />
      <rect x="4" y="10" width="16" height="3" rx="1" opacity="0.3" />
    </svg>
  );
}

function AsksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="3" width="16" height="3" rx="1" />
      <rect x="4" y="7" width="16" height="3" rx="1" />
      <rect x="4" y="11" width="16" height="3" rx="1" opacity="0.3" />
    </svg>
  );
}
