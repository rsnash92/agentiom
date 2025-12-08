'use client';

import { useEffect, useRef, memo, useState } from 'react';

interface TVChartProps {
  symbol: string;
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  currentPrice?: number;
}

export const TIMEFRAMES = [
  { label: '1m', value: '1m', tv: '1' },
  { label: '5m', value: '5m', tv: '5' },
  { label: '15m', value: '15m', tv: '15' },
  { label: '1h', value: '1h', tv: '60' },
  { label: '4h', value: '4h', tv: '240' },
  { label: '1d', value: '1d', tv: 'D' },
  { label: '1w', value: '1w', tv: 'W' },
];

// Map our symbols to TradingView symbols (Binance perps as proxy for visualization)
function getTradingViewSymbol(symbol: string): string {
  const coin = symbol
    .toUpperCase()
    .replace('-PERP', '')
    .replace('/USDT', '')
    .replace('-USDC', '')
    .replace('/USD', '');

  return `BINANCE:${coin}USDT.P`;
}

function TVChartComponent({
  symbol,
  selectedTimeframe,
}: TVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const coin = symbol.replace('-PERP', '').replace('/USDT', '').replace('-USDC', '');
  const tvSymbol = getTradingViewSymbol(symbol);
  const tvInterval = TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.tv || '60';

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';
    setIsLoading(true);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && containerRef.current) {
        widgetRef.current = new (window as any).TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: tvInterval,
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
          allow_symbol_change: false,
          studies: ['Volume@tv-basicstudies'],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          withdateranges: true,
          details: true,
          hotlist: false,
          calendar: false,
          // Custom colors to match dark theme
          overrides: {
            'paneProperties.background': '#0a0a0a',
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': '#1a1a1a',
            'paneProperties.horzGridProperties.color': '#1a1a1a',
            'scalesProperties.backgroundColor': '#0a0a0a',
            'scalesProperties.lineColor': '#1a1a1a',
            'scalesProperties.textColor': '#666666',
            'mainSeriesProperties.candleStyle.upColor': '#26a69a',
            'mainSeriesProperties.candleStyle.downColor': '#ef5350',
            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
            'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
          },
          loading_screen: {
            backgroundColor: '#0a0a0a',
            foregroundColor: '#26a69a',
          },
          disabled_features: [
            'header_symbol_search',
            'header_compare',
            'display_market_status',
            'header_saveload',
          ],
          enabled_features: [
            'study_templates',
            'use_localstorage_for_settings',
            'save_chart_properties_to_local_storage',
          ],
        });

        // Hide loading after widget loads
        setTimeout(() => setIsLoading(false), 1500);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      widgetRef.current = null;
    };
  }, [tvSymbol, tvInterval]);

  const containerId = `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg border border-border overflow-hidden relative">
      {/* Header showing this is Hyperliquid data visualization */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{coin}/USDC</span>
          <span className="text-xs text-foreground-muted">Hyperliquid Perps</span>
        </div>
        <div className="text-xs text-foreground-subtle">
          Chart: Binance {coin}USDT.P
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

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/90 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-foreground-muted">Loading chart...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const TVChart = memo(TVChartComponent);
