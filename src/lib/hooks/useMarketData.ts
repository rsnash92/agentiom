'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { hyperliquid, type MarketData, type OrderBook } from '@/lib/hyperliquid';
import { hyperliquidWs, type MidsUpdate, type L2BookUpdate } from '@/lib/hyperliquid';

interface UseMarketDataOptions {
  coin: string;
  refreshInterval?: number;
  enableWebSocket?: boolean;
}

interface UseMarketDataReturn {
  data: MarketData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching market data for a specific coin
 */
export function useMarketData({
  coin,
  refreshInterval = 5000,
  enableWebSocket = true,
}: UseMarketDataOptions): UseMarketDataReturn {
  const [data, setData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const wsConnectedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const marketData = await hyperliquid.getMarketData(coin);
      if (marketData) {
        setData(marketData);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
    } finally {
      setIsLoading(false);
    }
  }, [coin]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling fallback
  useEffect(() => {
    if (!enableWebSocket) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, enableWebSocket]);

  // WebSocket updates for real-time price
  useEffect(() => {
    if (!enableWebSocket) return;

    let unsubscribe: (() => void) | undefined;

    const setupWebSocket = async () => {
      try {
        await hyperliquidWs.connect();
        wsConnectedRef.current = true;

        unsubscribe = hyperliquidWs.subscribeAllMids((update: MidsUpdate) => {
          const midPrice = update.mids[coin];
          if (midPrice) {
            setData(prev => {
              if (!prev) return prev;
              const newMarkPx = parseFloat(midPrice);
              const priceChange24h = newMarkPx - prev.prevDayPx;
              const priceChangePct24h = prev.prevDayPx > 0
                ? (priceChange24h / prev.prevDayPx) * 100
                : 0;
              return {
                ...prev,
                markPx: newMarkPx,
                oraclePx: newMarkPx, // Approximate
                priceChange24h,
                priceChangePct24h,
              };
            });
          }
        });
      } catch (err) {
        console.error('WebSocket connection failed, falling back to polling:', err);
        wsConnectedRef.current = false;
      }
    };

    setupWebSocket();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [coin, enableWebSocket]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

interface UseOrderBookOptions {
  coin: string;
  levels?: number;
  refreshInterval?: number;
  enableWebSocket?: boolean;
}

interface UseOrderBookReturn {
  data: OrderBook | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching order book data
 */
export function useOrderBook({
  coin,
  levels = 15,
  refreshInterval = 1000,
  enableWebSocket = true,
}: UseOrderBookOptions): UseOrderBookReturn {
  const [data, setData] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const orderBook = await hyperliquid.getOrderBook(coin);
      if (orderBook) {
        // Limit levels
        setData({
          ...orderBook,
          bids: orderBook.bids.slice(0, levels),
          asks: orderBook.asks.slice(0, levels),
        });
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch order book'));
    } finally {
      setIsLoading(false);
    }
  }, [coin, levels]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket updates
  useEffect(() => {
    if (!enableWebSocket) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }

    let unsubscribe: (() => void) | undefined;

    const setupWebSocket = async () => {
      try {
        await hyperliquidWs.connect();

        unsubscribe = hyperliquidWs.subscribeL2Book(coin, (update: L2BookUpdate) => {
          // Process L2 book update
          let bidTotal = 0;
          const bids = update.levels[0].slice(0, levels).map(level => {
            const size = parseFloat(level.sz);
            bidTotal += size * parseFloat(level.px);
            return {
              price: parseFloat(level.px),
              size,
              total: bidTotal,
            };
          });

          let askTotal = 0;
          const asks = update.levels[1].slice(0, levels).map(level => {
            const size = parseFloat(level.sz);
            askTotal += size * parseFloat(level.px);
            return {
              price: parseFloat(level.px),
              size,
              total: askTotal,
            };
          });

          const bestBid = bids[0]?.price || 0;
          const bestAsk = asks[0]?.price || 0;
          const spread = bestAsk - bestBid;
          const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

          setData({
            symbol: coin,
            bids,
            asks,
            spread,
            spreadPercent,
            lastPrice: (bestBid + bestAsk) / 2,
            timestamp: update.time,
          });
        });
      } catch (err) {
        console.error('WebSocket connection failed, falling back to polling:', err);
        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
      }
    };

    setupWebSocket();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [coin, levels, refreshInterval, enableWebSocket, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

interface UseAllMarketsOptions {
  refreshInterval?: number;
}

interface UseAllMarketsReturn {
  prices: Record<string, number>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching all market prices
 */
export function useAllMarkets({
  refreshInterval = 5000,
}: UseAllMarketsOptions = {}): UseAllMarketsReturn {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        // Initial fetch
        const mids = await hyperliquid.getAllMids();
        const parsedPrices: Record<string, number> = {};
        for (const [coin, price] of Object.entries(mids)) {
          parsedPrices[coin] = parseFloat(price);
        }
        setPrices(parsedPrices);
        setIsLoading(false);

        // Subscribe to WebSocket updates
        await hyperliquidWs.connect();
        unsubscribe = hyperliquidWs.subscribeAllMids((update: MidsUpdate) => {
          const newPrices: Record<string, number> = {};
          for (const [coin, price] of Object.entries(update.mids)) {
            newPrices[coin] = parseFloat(price);
          }
          setPrices(prev => ({ ...prev, ...newPrices }));
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch prices'));
        setIsLoading(false);

        // Fallback to polling
        const fetchPrices = async () => {
          try {
            const mids = await hyperliquid.getAllMids();
            const parsedPrices: Record<string, number> = {};
            for (const [coin, price] of Object.entries(mids)) {
              parsedPrices[coin] = parseFloat(price);
            }
            setPrices(parsedPrices);
          } catch {
            // Ignore polling errors
          }
        };

        const interval = setInterval(fetchPrices, refreshInterval);
        return () => clearInterval(interval);
      }
    };

    setup();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshInterval]);

  return {
    prices,
    isLoading,
    error,
  };
}

// Extended market data with volume and change info
export interface MarketInfo {
  price: number;
  change24h: number;
  volume24h: number;
  funding: number;
  openInterest: number;
  maxLeverage: number;
}

interface UseAllMarketsDataOptions {
  refreshInterval?: number;
}

interface UseAllMarketsDataReturn {
  markets: Record<string, MarketInfo>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching all market data with volume, change, funding
 */
export function useAllMarketsData({
  refreshInterval = 5000,
}: UseAllMarketsDataOptions = {}): UseAllMarketsDataReturn {
  const [markets, setMarkets] = useState<Record<string, MarketInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const prevDayPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const fetchFullData = async () => {
      try {
        const [meta, ctxs] = await hyperliquid.getMetaAndAssetCtxs();

        const newMarkets: Record<string, MarketInfo> = {};
        const newPrevDayPrices: Record<string, number> = {};

        meta.universe.forEach((asset, index) => {
          const ctx = ctxs[index];
          if (ctx) {
            const markPx = parseFloat(ctx.markPx);
            const prevDayPx = parseFloat(ctx.prevDayPx);
            const change24h = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;

            newPrevDayPrices[asset.name] = prevDayPx;
            newMarkets[asset.name] = {
              price: markPx,
              change24h,
              volume24h: parseFloat(ctx.dayNtlVlm),
              funding: parseFloat(ctx.funding) * 100,
              openInterest: parseFloat(ctx.openInterest),
              maxLeverage: asset.maxLeverage,
            };
          }
        });

        prevDayPricesRef.current = newPrevDayPrices;
        setMarkets(newMarkets);
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
        setIsLoading(false);
      }
    };

    const setup = async () => {
      // Initial fetch of full data
      await fetchFullData();

      try {
        // Subscribe to WebSocket for real-time price updates
        await hyperliquidWs.connect();
        unsubscribe = hyperliquidWs.subscribeAllMids((update: MidsUpdate) => {
          setMarkets(prev => {
            const updated = { ...prev };
            for (const [coin, priceStr] of Object.entries(update.mids)) {
              if (updated[coin]) {
                const newPrice = parseFloat(priceStr);
                const prevDayPx = prevDayPricesRef.current[coin];
                const newChange = prevDayPx > 0 ? ((newPrice - prevDayPx) / prevDayPx) * 100 : updated[coin].change24h;
                updated[coin] = {
                  ...updated[coin],
                  price: newPrice,
                  change24h: newChange,
                };
              }
            }
            return updated;
          });
        });

        // Also refresh full data periodically to update volume/OI
        intervalId = setInterval(fetchFullData, 30000); // Every 30 seconds
      } catch {
        // Fallback to polling if WebSocket fails
        intervalId = setInterval(fetchFullData, refreshInterval);
      }
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  return {
    markets,
    isLoading,
    error,
  };
}
