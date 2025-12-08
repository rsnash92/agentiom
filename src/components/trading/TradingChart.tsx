'use client';

import { useEffect, useRef, useState } from 'react';

interface TradingChartProps {
  symbol: string;
  currentPrice?: number;
  priceChange?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: string;
  fundingRate?: number;
  fundingCountdown?: string;
}

// Map Hyperliquid symbols to TradingView symbols
function getTradingViewSymbol(symbol: string): string {
  // Remove common suffixes and normalize
  const base = symbol
    .toUpperCase()
    .replace('/USDT', '')
    .replace('-USD', '')
    .replace('-USDT', '')
    .replace('PERP', '');

  // Use Binance perpetuals for most pairs
  return `BINANCE:${base}USDT.P`;
}

export function TradingChart({
  symbol,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('15');
  const widgetRef = useRef<any>(null);

  const timeframes = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: '1D', value: 'D' },
    { label: '1W', value: 'W' },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && containerRef.current) {
        widgetRef.current = new (window as any).TradingView.widget({
          autosize: true,
          symbol: getTradingViewSymbol(symbol),
          interval: selectedTimeframe,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1', // Candlestick
          locale: 'en',
          toolbar_bg: '#0a0a0a',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerRef.current.id,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          studies: ['Volume@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          // Custom colors to match your dark theme
          overrides: {
            'paneProperties.background': '#0a0a0a',
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': '#1a1a1a',
            'paneProperties.horzGridProperties.color': '#1a1a1a',
            'scalesProperties.backgroundColor': '#0a0a0a',
            'scalesProperties.lineColor': '#1a1a1a',
            'scalesProperties.textColor': '#666666',
            'mainSeriesProperties.candleStyle.upColor': '#2dd4a0',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#2dd4a0',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#2dd4a0',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          },
          loading_screen: {
            backgroundColor: '#0a0a0a',
            foregroundColor: '#2dd4a0',
          },
          disabled_features: [
            'header_symbol_search',
            'header_compare',
          ],
          enabled_features: [
            'hide_left_toolbar_by_default',
          ],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, selectedTimeframe]);

  const containerId = `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setSelectedTimeframe(tf.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                selectedTimeframe === tf.value
                  ? 'bg-card text-foreground'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-foreground-muted">
          {getTradingViewSymbol(symbol)}
        </div>
      </div>

      {/* TradingView Chart */}
      <div className="flex-1 min-h-[400px]">
        <div
          id={containerId}
          ref={containerRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
