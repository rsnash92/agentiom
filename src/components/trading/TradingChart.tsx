'use client';

import { useState } from 'react';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  fundingRate: number;
  fundingCountdown: string;
}

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

export function TradingChart({
  symbol,
  currentPrice,
  priceChange,
  high24h,
  low24h,
  volume24h,
  fundingRate,
  fundingCountdown,
}: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const isPositive = priceChange >= 0;

  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-6">
          {/* Symbol & Price */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full pair-icon ${symbol.toLowerCase().replace('/usdt', '').replace('-usd', '')}`} />
              <span className="text-lg font-semibold">{symbol}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-mono">${currentPrice.toLocaleString()}</span>
              <span className={`text-xs font-mono ${isPositive ? 'text-success' : 'text-error'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div>
              <span className="text-foreground-subtle">24h High</span>
              <span className="ml-2 font-mono text-foreground">${high24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-foreground-subtle">24h Low</span>
              <span className="ml-2 font-mono text-foreground">${low24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-foreground-subtle">24h Vol</span>
              <span className="ml-2 font-mono text-foreground">{volume24h}</span>
            </div>
            <div>
              <span className="text-foreground-subtle">Funding</span>
              <span className={`ml-2 font-mono ${fundingRate >= 0 ? 'text-success' : 'text-error'}`}>
                {fundingRate >= 0 ? '+' : ''}{fundingRate.toFixed(4)}%
              </span>
              <span className="ml-1 text-foreground-subtle">{fundingCountdown}</span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-background rounded-md p-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                selectedTimeframe === tf
                  ? 'bg-card text-foreground'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area - Placeholder for TradingView or custom chart */}
      <div className="flex-1 relative min-h-[400px]">
        {/* Placeholder candlestick visualization */}
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? '#2dd4a0' : '#ef4444'} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isPositive ? '#2dd4a0' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[...Array(6)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={`${(i + 1) * 16.66}%`}
              x2="100%"
              y2={`${(i + 1) * 16.66}%`}
              stroke="#1e1e1e"
              strokeWidth="1"
            />
          ))}
          {[...Array(12)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={`${(i + 1) * 8.33}%`}
              y1="0"
              x2={`${(i + 1) * 8.33}%`}
              y2="100%"
              stroke="#1e1e1e"
              strokeWidth="1"
            />
          ))}

          {/* Sample candlesticks */}
          {generateSampleCandles(50, isPositive).map((candle, i) => (
            <g key={i}>
              {/* Wick */}
              <line
                x1={`${candle.x}%`}
                y1={`${candle.wickTop}%`}
                x2={`${candle.x}%`}
                y2={`${candle.wickBottom}%`}
                stroke={candle.isGreen ? '#2dd4a0' : '#ef4444'}
                strokeWidth="1"
              />
              {/* Body */}
              <rect
                x={`${candle.x - 0.6}%`}
                y={`${candle.bodyTop}%`}
                width="1.2%"
                height={`${candle.bodyHeight}%`}
                fill={candle.isGreen ? '#2dd4a0' : '#ef4444'}
                rx="1"
              />
            </g>
          ))}

          {/* Area under line */}
          <path
            d={generateAreaPath(50, isPositive)}
            fill="url(#chartGradient)"
          />
        </svg>

        {/* Current price line */}
        <div
          className="absolute right-0 flex items-center"
          style={{ top: '45%' }}
        >
          <div className="h-px w-full border-t border-dashed border-primary/50" />
          <div className="px-2 py-0.5 bg-primary text-black text-xs font-mono rounded-l">
            ${currentPrice.toLocaleString()}
          </div>
        </div>

        {/* TradingView attribution placeholder */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-foreground-subtle text-xs">
          <svg className="w-5 h-5" viewBox="0 0 36 28" fill="currentColor">
            <path d="M14 22H7V6h7v16zm15-10h-7v10h7V12zm-8-6h-7v16h7V6z"/>
          </svg>
          <span>Chart</span>
        </div>
      </div>

      {/* Chart Tools Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <CrosshairIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <TrendlineIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <FibIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <TextIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <IndicatorsIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <ExpandIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to generate sample candles
function generateSampleCandles(count: number, trendUp: boolean) {
  const candles = [];
  let baseY = trendUp ? 70 : 30;

  for (let i = 0; i < count; i++) {
    const isGreen = Math.random() > (trendUp ? 0.4 : 0.6);
    const volatility = Math.random() * 8 + 2;
    const bodyHeight = Math.random() * 6 + 2;

    // Trend adjustment
    if (trendUp) {
      baseY -= (Math.random() - 0.3) * 1.5;
    } else {
      baseY += (Math.random() - 0.3) * 1.5;
    }
    baseY = Math.max(15, Math.min(85, baseY));

    const bodyTop = baseY - (isGreen ? bodyHeight : 0);

    candles.push({
      x: (i + 1) * (100 / (count + 1)),
      wickTop: bodyTop - volatility / 2,
      wickBottom: bodyTop + bodyHeight + volatility / 2,
      bodyTop,
      bodyHeight,
      isGreen,
    });
  }
  return candles;
}

// Helper to generate area path
function generateAreaPath(count: number, trendUp: boolean) {
  let path = 'M 0 100 ';
  let baseY = trendUp ? 70 : 30;

  for (let i = 0; i <= count; i++) {
    if (trendUp) {
      baseY -= (Math.random() - 0.3) * 1.5;
    } else {
      baseY += (Math.random() - 0.3) * 1.5;
    }
    baseY = Math.max(15, Math.min(85, baseY));
    const x = (i / count) * 100;
    path += `L ${x} ${baseY} `;
  }
  path += 'L 100 100 Z';
  return path;
}

// Icons
function CrosshairIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

function TrendlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="20" x2="21" y2="4" />
    </svg>
  );
}

function FibIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18H3V3z" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </svg>
  );
}

function IndicatorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 5-6" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
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
