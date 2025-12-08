'use client';

import { useEffect, useRef, memo, useState, useCallback } from 'react';

interface TVChartProps {
  symbol: string;
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  currentPrice?: number;
}

export const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
];

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function TVChartComponent({
  symbol,
  selectedTimeframe,
}: TVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const candleSeriesRef = useRef<unknown>(null);
  const volumeSeriesRef = useRef<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastCandleRef = useRef<CandleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const coin = symbol.replace('-PERP', '').replace('/USDT', '').replace('-USDC', '');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCandles = useCallback(async () => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/candles?coin=${coin}&interval=${selectedTimeframe}&limit=500`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch candle data');
      }

      const data: CandleData[] = await response.json();

      if (data.length === 0) {
        setError('No data available for this market');
        return;
      }

      const candleSeries = candleSeriesRef.current as { setData: (data: unknown[]) => void };
      const volumeSeries = volumeSeriesRef.current as { setData: (data: unknown[]) => void };

      candleSeries.setData(
        data.map(d => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );

      volumeSeries.setData(
        data.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        }))
      );

      // Store last candle for real-time updates
      if (data.length > 0) {
        lastCandleRef.current = data[data.length - 1];
      }

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error('Error fetching candles:', err);
      setError('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [coin, selectedTimeframe]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!isMounted) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected, subscribing to', coin);
        ws?.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'trades', coin }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Handle both initial subscription confirmation and trade updates
          if (msg.channel === 'trades' && msg.data) {
            const trades = Array.isArray(msg.data) ? msg.data : [msg.data];
            if (trades.length === 0) return;

            for (const trade of trades) {
              const price = parseFloat(trade.px);
              const size = parseFloat(trade.sz);

              if (!lastCandleRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) continue;
              if (isNaN(price) || isNaN(size)) continue;

              const candleSeries = candleSeriesRef.current as { update: (data: unknown) => void };
              const volumeSeries = volumeSeriesRef.current as { update: (data: unknown) => void };

              const currentCandle = lastCandleRef.current;
              const updatedCandle = {
                time: currentCandle.time,
                open: currentCandle.open,
                high: Math.max(currentCandle.high, price),
                low: Math.min(currentCandle.low, price),
                close: price,
              };

              candleSeries.update(updatedCandle);

              const newVolume = currentCandle.volume + size;
              volumeSeries.update({
                time: currentCandle.time,
                value: newVolume,
                color: updatedCandle.close >= updatedCandle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
              });

              lastCandleRef.current = {
                ...currentCandle,
                high: updatedCandle.high,
                low: updatedCandle.low,
                close: price,
                volume: newVolume,
              };
            }
          }
        } catch (err) {
          // Ignore parse errors
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        reconnectTimeout = setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };
    };

    // Wait for chart data to load first
    const initTimeout = setTimeout(connectWebSocket, 2000);

    return () => {
      clearTimeout(initTimeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [isMounted, coin]);

  useEffect(() => {
    if (!containerRef.current || !isMounted) return;

    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null;
    let resizeHandler: (() => void) | null = null;

    const initChart = async () => {
      const lc = await import('lightweight-charts');

      if (!containerRef.current) return;

      chart = lc.createChart(containerRef.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#0a0a0a' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1e1e1e' },
          horzLines: { color: '#1e1e1e' },
        },
        crosshair: {
          mode: 1,
          vertLine: { width: 1, color: '#4b5563', style: 2 },
          horzLine: { width: 1, color: '#4b5563', style: 2 },
        },
        rightPriceScale: {
          borderColor: '#1e1e1e',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#1e1e1e',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: { axisPressedMouseMove: true },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      candleSeriesRef.current = candleSeries;

      const volumeSeries = chart.addSeries(lc.HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volumeSeriesRef.current = volumeSeries;

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      resizeHandler = () => {
        if (containerRef.current && chart) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', resizeHandler);
      resizeHandler();

      // Fetch initial data
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/candles?coin=${coin}&interval=${selectedTimeframe}&limit=500`
        );

        if (response.ok) {
          const data: CandleData[] = await response.json();
          if (data.length > 0) {
            candleSeries.setData(
              data.map(d => ({
                time: Math.floor(d.time / 1000) as import('lightweight-charts').UTCTimestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
              }))
            );
            volumeSeries.setData(
              data.map(d => ({
                time: Math.floor(d.time / 1000) as import('lightweight-charts').UTCTimestamp,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
              }))
            );
            chart.timeScale().fitContent();

            // Store last candle for real-time updates
            lastCandleRef.current = data[data.length - 1];
          }
        }
      } catch (err) {
        console.error('Error fetching initial candles:', err);
        setError('Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    initChart();

    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      lastCandleRef.current = null;
    };
  }, [isMounted, coin, selectedTimeframe]);

  if (!isMounted) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg border border-border overflow-hidden relative">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{coin}/USDC</span>
            <span className="text-xs text-foreground-muted">Hyperliquid Perps</span>
          </div>
        </div>
        <div className="flex-1 min-h-[400px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-lg border border-border overflow-hidden relative">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{coin}/USDC</span>
          <span className="text-xs text-foreground-muted">Hyperliquid Perps</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-[400px]" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-foreground-muted">Loading chart...</span>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={fetchCandles}
              className="text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const TVChart = memo(TVChartComponent);
