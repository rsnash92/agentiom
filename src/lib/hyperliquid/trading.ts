/**
 * Hyperliquid Trading Service
 * Enables agent wallets to execute trades on Hyperliquid
 *
 * Note: Hyperliquid uses L1 address deposits from Arbitrum.
 * Agent wallets need to deposit USDC to their Hyperliquid address first.
 */

import { keccak256, encodePacked, type Address } from 'viem';

const API_BASE = 'https://api.hyperliquid.xyz';

// Hyperliquid order types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type TimeInForce = 'Gtc' | 'Ioc' | 'Alo';

export interface OrderRequest {
  coin: string;
  isBuy: boolean;
  sz: string;
  limitPx: string;
  orderType: { limit: { tif: TimeInForce } } | { trigger: { triggerPx: string; isMarket: boolean; tpsl: string } };
  reduceOnly: boolean;
}

export interface PlaceOrderParams {
  coin: string;
  side: OrderSide;
  size: number;
  price?: number; // Required for limit orders
  orderType?: OrderType;
  reduceOnly?: boolean;
  timeInForce?: TimeInForce;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  status?: string;
  filledSize?: number;
  avgPrice?: number;
}

export interface CancelOrderParams {
  coin: string;
  orderId: string;
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

export interface AccountSummary {
  accountValue: number;
  totalPositionValue: number;
  marginUsed: number;
  freeCollateral: number;
  positions: Position[];
}

/**
 * Trading service for agent wallets on Hyperliquid
 */
export class HyperliquidTrader {
  private agentAddress: Address;
  private signMessage: (message: string) => Promise<string>;

  constructor(
    agentAddress: Address,
    signMessage: (message: string) => Promise<string>
  ) {
    this.agentAddress = agentAddress;
    this.signMessage = signMessage;
  }

  /**
   * Build the action hash for signing
   */
  private buildActionHash(action: unknown, vaultAddress?: string, nonce: number = Date.now()): string {
    const actionHash = keccak256(
      encodePacked(
        ['string'],
        [JSON.stringify(action)]
      )
    );

    if (vaultAddress) {
      return keccak256(
        encodePacked(
          ['bytes32', 'address', 'uint64'],
          [actionHash as `0x${string}`, vaultAddress as Address, BigInt(nonce)]
        )
      );
    }

    return keccak256(
      encodePacked(
        ['bytes32', 'uint64'],
        [actionHash as `0x${string}`, BigInt(nonce)]
      )
    );
  }

  /**
   * Sign and send an action to Hyperliquid
   */
  private async sendAction(action: unknown, nonce: number = Date.now()): Promise<unknown> {
    const actionHash = this.buildActionHash(action, undefined, nonce);
    const signature = await this.signMessage(actionHash);

    const response = await fetch(`${API_BASE}/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        nonce,
        signature: {
          r: signature.slice(0, 66),
          s: '0x' + signature.slice(66, 130),
          v: parseInt(signature.slice(130, 132), 16),
        },
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
   * Place an order
   */
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const { coin, side, size, price, orderType = 'limit', reduceOnly = false, timeInForce = 'Gtc' } = params;

    // For market orders, use a very favorable limit price
    const limitPx = price?.toString() || '0';

    const orderRequest: OrderRequest = {
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

    try {
      const result = await this.sendAction(action);
      const response = result as { status: string; response?: { type: string; data?: { statuses: Array<{ filled?: { totalSz: string; avgPx: string }; resting?: { oid: number }; error?: string }> } } };

      if (response.status === 'ok' && response.response?.data?.statuses?.[0]) {
        const status = response.response.data.statuses[0];

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
          return {
            success: false,
            error: status.error,
          };
        }
      }

      return {
        success: false,
        error: 'Unknown response format',
      };
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
  async cancelOrder(params: CancelOrderParams): Promise<OrderResult> {
    const { coin, orderId } = params;

    const action = {
      type: 'cancel',
      cancels: [{
        coin,
        oid: parseInt(orderId),
      }],
    };

    try {
      const result = await this.sendAction(action);
      const response = result as { status: string };

      return {
        success: response.status === 'ok',
        orderId,
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
    const action = {
      type: 'cancelByCloid',
      cancels: [{
        coin,
      }],
    };

    try {
      const result = await this.sendAction(action);
      const response = result as { status: string };

      return {
        success: response.status === 'ok',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get account summary including positions
   */
  async getAccountSummary(): Promise<AccountSummary | null> {
    try {
      const response = await fetch(`${API_BASE}/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: this.agentAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as {
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
      };

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
            markPrice: parseFloat(pos.positionValue) / Math.abs(size),
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
      console.error('Error fetching account summary:', error);
      return null;
    }
  }

  /**
   * Set leverage for a coin
   */
  async setLeverage(coin: string, leverage: number, isCross: boolean = true): Promise<boolean> {
    const action = {
      type: 'updateLeverage',
      asset: this.getCoinIndex(coin),
      isCross,
      leverage,
    };

    try {
      const result = await this.sendAction(action);
      const response = result as { status: string };
      return response.status === 'ok';
    } catch (error) {
      console.error('Error setting leverage:', error);
      return false;
    }
  }

  /**
   * Get coin index from name (simplified - in production, fetch from API)
   */
  private getCoinIndex(coin: string): number {
    // Common coins - in production, fetch this from meta endpoint
    const coinMap: Record<string, number> = {
      'BTC': 0,
      'ETH': 1,
      'SOL': 2,
      'DOGE': 3,
      'ARB': 4,
      'OP': 5,
      'LINK': 6,
      'AVAX': 7,
      'WIF': 8,
      'PEPE': 9,
      'NEAR': 10,
      'TIA': 11,
      'INJ': 12,
      'SEI': 13,
      'ATOM': 14,
    };
    return coinMap[coin] ?? 0;
  }
}

/**
 * Create a trader instance for an agent wallet
 */
export function createAgentTrader(
  agentAddress: Address,
  signMessage: (message: string) => Promise<string>
): HyperliquidTrader {
  return new HyperliquidTrader(agentAddress, signMessage);
}
