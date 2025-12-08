/**
 * Server-side Hyperliquid Trading Service
 * Enables autonomous agent trading with encrypted private keys
 */

import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { keccak256, encodePacked, type Address, type Hex } from 'viem';
import { HYPERLIQUID_ENDPOINTS } from '@/config/constants';

const API_BASE = HYPERLIQUID_ENDPOINTS.mainnet.api;

// Types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type TimeInForce = 'Gtc' | 'Ioc' | 'Alo';

export interface PlaceOrderParams {
  coin: string;
  side: OrderSide;
  size: number;
  price?: number;
  orderType?: OrderType;
  reduceOnly?: boolean;
  timeInForce?: TimeInForce;
  leverage?: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  status?: 'filled' | 'open' | 'cancelled' | 'rejected';
  filledSize?: number;
  avgPrice?: number;
}

export interface Position {
  coin: string;
  size: number;
  side: 'long' | 'short';
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number | null;
  marginUsed: number;
}

export interface AccountState {
  accountValue: number;
  totalPositionValue: number;
  marginUsed: number;
  freeCollateral: number;
  positions: Position[];
}

// Coin index mapping - fetched dynamically in production
const COIN_INDEX_MAP: Record<string, number> = {
  'BTC': 0, 'ETH': 1, 'SOL': 2, 'DOGE': 3, 'ARB': 4,
  'OP': 5, 'LINK': 6, 'AVAX': 7, 'WIF': 8, 'PEPE': 9,
  'NEAR': 10, 'TIA': 11, 'INJ': 12, 'SEI': 13, 'ATOM': 14,
  'SUI': 15, 'APT': 16, 'MATIC': 17, 'LTC': 18, 'FTM': 19,
};

/**
 * Server-side Hyperliquid trader for autonomous agents
 */
export class ServerHyperliquidTrader {
  private account: PrivateKeyAccount;
  private address: Address;
  private testnet: boolean;
  private apiBase: string;

  constructor(privateKey: Hex, testnet = false) {
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;
    this.testnet = testnet;
    this.apiBase = testnet ? HYPERLIQUID_ENDPOINTS.testnet.api : API_BASE;
  }

  /**
   * Get the agent's wallet address
   */
  getAddress(): Address {
    return this.address;
  }

  /**
   * Build action hash for EIP-712 signing
   */
  private buildActionHash(action: unknown, nonce: number): Hex {
    const actionHash = keccak256(
      encodePacked(['string'], [JSON.stringify(action)])
    );

    return keccak256(
      encodePacked(
        ['bytes32', 'uint64'],
        [actionHash, BigInt(nonce)]
      )
    );
  }

  /**
   * Sign a message using the agent's private key
   */
  private async signMessage(message: Hex): Promise<{ r: Hex; s: Hex; v: number }> {
    const signature = await this.account.signMessage({
      message: { raw: message },
    });

    return {
      r: `0x${signature.slice(2, 66)}` as Hex,
      s: `0x${signature.slice(66, 130)}` as Hex,
      v: parseInt(signature.slice(130, 132), 16),
    };
  }

  /**
   * Send a signed action to Hyperliquid exchange
   */
  private async sendAction<T>(action: unknown): Promise<T> {
    const nonce = Date.now();
    const actionHash = this.buildActionHash(action, nonce);
    const signature = await this.signMessage(actionHash);

    const response = await fetch(`${this.apiBase}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        nonce,
        signature,
        vaultAddress: null,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hyperliquid API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Send info request (no signature required)
   */
  private async postInfo<T>(type: string, payload?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.apiBase}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get current market price for a coin
   */
  async getMarkPrice(coin: string): Promise<number | null> {
    try {
      const mids = await this.postInfo<Record<string, string>>('allMids');
      return mids[coin] ? parseFloat(mids[coin]) : null;
    } catch (error) {
      console.error('Error fetching mark price:', error);
      return null;
    }
  }

  /**
   * Get account state including positions
   */
  async getAccountState(): Promise<AccountState | null> {
    try {
      const data = await this.postInfo<{
        crossMarginSummary: {
          accountValue: string;
          totalNtlPos: string;
          totalMarginUsed: string;
          withdrawable: string;
        };
        assetPositions: Array<{
          position: {
            coin: string;
            szi: string;
            entryPx: string;
            positionValue: string;
            unrealizedPnl: string;
            leverage: { type: string; value: number };
            liquidationPx: string | null;
            marginUsed: string;
          };
        }>;
      }>('clearinghouseState', { user: this.address });

      const positions: Position[] = data.assetPositions
        .filter(ap => parseFloat(ap.position.szi) !== 0)
        .map(ap => {
          const pos = ap.position;
          const size = parseFloat(pos.szi);
          return {
            coin: pos.coin,
            size: Math.abs(size),
            side: size > 0 ? 'long' : 'short',
            entryPrice: parseFloat(pos.entryPx),
            markPrice: parseFloat(pos.positionValue) / Math.abs(size) || 0,
            unrealizedPnl: parseFloat(pos.unrealizedPnl),
            leverage: pos.leverage.value,
            liquidationPrice: pos.liquidationPx ? parseFloat(pos.liquidationPx) : null,
            marginUsed: parseFloat(pos.marginUsed),
          } as Position;
        });

      return {
        accountValue: parseFloat(data.crossMarginSummary.accountValue),
        totalPositionValue: parseFloat(data.crossMarginSummary.totalNtlPos),
        marginUsed: parseFloat(data.crossMarginSummary.totalMarginUsed),
        freeCollateral: parseFloat(data.crossMarginSummary.withdrawable),
        positions,
      };
    } catch (error) {
      console.error('Error fetching account state:', error);
      return null;
    }
  }

  /**
   * Set leverage for a coin
   */
  async setLeverage(coin: string, leverage: number, isCross = true): Promise<boolean> {
    try {
      const action = {
        type: 'updateLeverage',
        asset: this.getCoinIndex(coin),
        isCross,
        leverage,
      };

      const result = await this.sendAction<{ status: string }>(action);
      return result.status === 'ok';
    } catch (error) {
      console.error('Error setting leverage:', error);
      return false;
    }
  }

  /**
   * Place an order
   */
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const {
      coin,
      side,
      size,
      price,
      orderType = 'limit',
      reduceOnly = false,
      timeInForce = 'Gtc',
      leverage,
    } = params;

    try {
      // Set leverage if specified
      if (leverage) {
        await this.setLeverage(coin, leverage);
      }

      // For market orders, get current price and add slippage
      let limitPx: string;
      if (orderType === 'market' || !price) {
        const markPrice = await this.getMarkPrice(coin);
        if (!markPrice) {
          return { success: false, error: 'Could not fetch market price' };
        }
        // Add 1% slippage for market orders
        const slippage = side === 'buy' ? 1.01 : 0.99;
        limitPx = (markPrice * slippage).toPrecision(6);
      } else {
        limitPx = price.toString();
      }

      const orderRequest = {
        coin,
        isBuy: side === 'buy',
        sz: size.toString(),
        limitPx,
        orderType: { limit: { tif: timeInForce } },
        reduceOnly,
      };

      const action = {
        type: 'order',
        orders: [orderRequest],
        grouping: 'na',
      };

      const result = await this.sendAction<{
        status: string;
        response?: {
          type: string;
          data?: {
            statuses: Array<{
              filled?: { totalSz: string; avgPx: string };
              resting?: { oid: number };
              error?: string;
            }>;
          };
        };
      }>(action);

      if (result.status === 'ok' && result.response?.data?.statuses?.[0]) {
        const status = result.response.data.statuses[0];

        if (status.filled) {
          return {
            success: true,
            status: 'filled',
            filledSize: parseFloat(status.filled.totalSz),
            avgPrice: parseFloat(status.filled.avgPx),
          };
        }

        if (status.resting) {
          return {
            success: true,
            orderId: status.resting.oid.toString(),
            status: 'open',
          };
        }

        if (status.error) {
          return { success: false, error: status.error, status: 'rejected' };
        }
      }

      return { success: false, error: 'Unknown response format' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(coin: string, orderId: string): Promise<OrderResult> {
    try {
      const action = {
        type: 'cancel',
        cancels: [{ coin, oid: parseInt(orderId) }],
      };

      const result = await this.sendAction<{ status: string }>(action);

      return {
        success: result.status === 'ok',
        orderId,
        status: result.status === 'ok' ? 'cancelled' : 'rejected',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel all orders for a coin
   */
  async cancelAllOrders(coin: string): Promise<OrderResult> {
    try {
      const action = {
        type: 'cancelByCloid',
        cancels: [{ coin }],
      };

      const result = await this.sendAction<{ status: string }>(action);
      return { success: result.status === 'ok' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Market buy
   */
  async marketBuy(coin: string, size: number, leverage?: number): Promise<OrderResult> {
    return this.placeOrder({
      coin,
      side: 'buy',
      size,
      orderType: 'market',
      leverage,
    });
  }

  /**
   * Market sell
   */
  async marketSell(coin: string, size: number, leverage?: number): Promise<OrderResult> {
    return this.placeOrder({
      coin,
      side: 'sell',
      size,
      orderType: 'market',
      leverage,
    });
  }

  /**
   * Close a position
   */
  async closePosition(coin: string): Promise<OrderResult> {
    const state = await this.getAccountState();
    if (!state) {
      return { success: false, error: 'Could not fetch account state' };
    }

    const position = state.positions.find(p => p.coin === coin);
    if (!position) {
      return { success: false, error: 'No position found for coin' };
    }

    return this.placeOrder({
      coin,
      side: position.side === 'long' ? 'sell' : 'buy',
      size: position.size,
      orderType: 'market',
      reduceOnly: true,
    });
  }

  /**
   * Get coin index from name
   */
  private getCoinIndex(coin: string): number {
    return COIN_INDEX_MAP[coin] ?? 0;
  }
}

/**
 * Create a server-side trader from an encrypted private key
 */
export function createServerTrader(privateKey: Hex, testnet = false): ServerHyperliquidTrader {
  return new ServerHyperliquidTrader(privateKey, testnet);
}
