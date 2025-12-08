/**
 * Hyperliquid API Client
 * Provides methods to fetch market data, positions, and execute trades
 */

import { HYPERLIQUID_ENDPOINTS } from '@/config/constants';

const API_BASE = HYPERLIQUID_ENDPOINTS.mainnet.api;

export interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

export interface AssetMeta {
  universe: AssetInfo[];
}

export interface AssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
  midPx: string;
  impactPxs: [string, string];
}

export interface MarketData {
  coin: string;
  markPx: number;
  oraclePx: number;
  funding: number;
  openInterest: number;
  volume24h: number;
  prevDayPx: number;
  priceChange24h: number;
  priceChangePct24h: number;
  high24h: number;
  low24h: number;
}

export interface L2Book {
  coin: string;
  levels: [L2Level[], L2Level[]]; // [bids, asks]
  time: number;
}

export interface L2Level {
  px: string;
  sz: string;
  n: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  lastPrice: number;
  timestamp: number;
}

export interface Candle {
  t: number; // timestamp
  T: number; // close timestamp
  s: string; // symbol
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // volume
  n: number; // number of trades
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface UserPosition {
  coin: string;
  szi: string;
  leverage: {
    type: string;
    value: number;
  };
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string | null;
  marginUsed: string;
  maxTradeSzs: [string, string];
}

export interface UserState {
  assetPositions: {
    position: UserPosition;
    type: string;
  }[];
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
    withdrawable: string;
  };
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
}

class HyperliquidClient {
  private baseUrl: string;

  constructor(testnet = false) {
    this.baseUrl = testnet
      ? HYPERLIQUID_ENDPOINTS.testnet.api
      : HYPERLIQUID_ENDPOINTS.mainnet.api;
  }

  /**
   * Make a POST request to the Hyperliquid info API
   */
  private async postInfo<T>(type: string, payload?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, ...payload }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all asset metadata
   */
  async getMeta(): Promise<AssetMeta> {
    return this.postInfo<AssetMeta>('meta');
  }

  /**
   * Get all market contexts (prices, funding, OI, etc.)
   */
  async getAllMids(): Promise<Record<string, string>> {
    return this.postInfo<Record<string, string>>('allMids');
  }

  /**
   * Get detailed market data for all assets
   */
  async getMetaAndAssetCtxs(): Promise<[AssetMeta, AssetCtx[]]> {
    return this.postInfo<[AssetMeta, AssetCtx[]]>('metaAndAssetCtxs');
  }

  /**
   * Get market data for a specific coin
   */
  async getMarketData(coin: string): Promise<MarketData | null> {
    try {
      const [meta, ctxs] = await this.getMetaAndAssetCtxs();

      const assetIndex = meta.universe.findIndex(a => a.name === coin);
      if (assetIndex === -1) return null;

      const ctx = ctxs[assetIndex];
      const markPx = parseFloat(ctx.markPx);
      const oraclePx = parseFloat(ctx.oraclePx);
      const prevDayPx = parseFloat(ctx.prevDayPx);
      const priceChange24h = markPx - prevDayPx;
      const priceChangePct24h = prevDayPx > 0 ? (priceChange24h / prevDayPx) * 100 : 0;

      return {
        coin,
        markPx,
        oraclePx,
        funding: parseFloat(ctx.funding) * 100, // Convert to percentage
        openInterest: parseFloat(ctx.openInterest),
        volume24h: parseFloat(ctx.dayNtlVlm),
        prevDayPx,
        priceChange24h,
        priceChangePct24h,
        high24h: markPx * 1.05, // Placeholder - need to calculate from candles
        low24h: markPx * 0.95,  // Placeholder - need to calculate from candles
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }

  /**
   * Get L2 order book for a coin
   */
  async getL2Book(coin: string): Promise<L2Book> {
    return this.postInfo<L2Book>('l2Book', { coin });
  }

  /**
   * Get formatted order book with calculated totals
   */
  async getOrderBook(coin: string): Promise<OrderBook | null> {
    try {
      const l2 = await this.getL2Book(coin);
      const mids = await this.getAllMids();
      const lastPrice = parseFloat(mids[coin] || '0');

      // Process bids (buy orders)
      let bidTotal = 0;
      const bids: OrderBookEntry[] = l2.levels[0].map(level => {
        const size = parseFloat(level.sz);
        bidTotal += size * parseFloat(level.px);
        return {
          price: parseFloat(level.px),
          size: size,
          total: bidTotal,
        };
      });

      // Process asks (sell orders)
      let askTotal = 0;
      const asks: OrderBookEntry[] = l2.levels[1].map(level => {
        const size = parseFloat(level.sz);
        askTotal += size * parseFloat(level.px);
        return {
          price: parseFloat(level.px),
          size: size,
          total: askTotal,
        };
      });

      // Calculate spread
      const bestBid = bids[0]?.price || 0;
      const bestAsk = asks[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

      return {
        symbol: coin,
        bids,
        asks,
        spread,
        spreadPercent,
        lastPrice,
        timestamp: l2.time,
      };
    } catch (error) {
      console.error('Error fetching order book:', error);
      return null;
    }
  }

  /**
   * Get candlestick data
   */
  async getCandles(
    coin: string,
    interval: string = '1h',
    startTime?: number,
    endTime?: number
  ): Promise<CandleData[]> {
    try {
      const now = Date.now();
      const start = startTime || now - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      const end = endTime || now;

      // Hyperliquid candleSnapshot requires a 'req' wrapper
      console.log('[Hyperliquid] Fetching candles:', { coin, interval, startTime: start, endTime: end });
      const response = await this.postInfo<Candle[]>('candleSnapshot', {
        req: {
          coin,
          interval,
          startTime: start,
          endTime: end,
        },
      });
      console.log('[Hyperliquid] Raw candle response length:', response?.length);

      return response.map(c => ({
        time: c.t,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: parseFloat(c.v),
      }));
    } catch (error) {
      console.error('Error fetching candles:', error);
      return [];
    }
  }

  /**
   * Get user state (positions, margin, etc.)
   */
  async getUserState(userAddress: string): Promise<UserState | null> {
    try {
      return this.postInfo<UserState>('clearinghouseState', {
        user: userAddress,
      });
    } catch (error) {
      console.error('Error fetching user state:', error);
      return null;
    }
  }

  /**
   * Get funding history for a coin
   */
  async getFundingHistory(
    coin: string,
    startTime: number,
    endTime?: number
  ): Promise<{ coin: string; fundingRate: string; premium: string; time: number }[]> {
    try {
      return this.postInfo('fundingHistory', {
        coin,
        startTime,
        endTime: endTime || Date.now(),
      });
    } catch (error) {
      console.error('Error fetching funding history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const hyperliquid = new HyperliquidClient();

// Export class for custom instances
export { HyperliquidClient };
