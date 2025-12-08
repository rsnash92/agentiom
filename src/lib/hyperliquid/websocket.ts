/**
 * Hyperliquid WebSocket Client
 * Provides real-time market data subscriptions
 */

import { HYPERLIQUID_ENDPOINTS } from '@/config/constants';

export type SubscriptionType =
  | 'allMids'
  | 'l2Book'
  | 'trades'
  | 'candle'
  | 'orderUpdates'
  | 'userEvents';

export interface WebSocketMessage {
  channel: string;
  data: unknown;
}

export interface MidsUpdate {
  mids: Record<string, string>;
}

export interface L2BookUpdate {
  coin: string;
  levels: [Array<{ px: string; sz: string; n: number }>, Array<{ px: string; sz: string; n: number }>];
  time: number;
}

export interface TradeUpdate {
  coin: string;
  side: 'B' | 'A'; // Buy or Ask (sell)
  px: string;
  sz: string;
  time: number;
  hash: string;
}

type MessageCallback = (data: unknown) => void;

class HyperliquidWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private subscriptions: Map<string, Set<MessageCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: Array<{ type: string; payload: unknown }> = [];

  constructor(testnet = false) {
    this.url = testnet
      ? HYPERLIQUID_ENDPOINTS.testnet.ws
      : HYPERLIQUID_ENDPOINTS.mainnet.ws;
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('Hyperliquid WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Process queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) {
              this.send(msg.type, msg.payload);
            }
          }

          // Resubscribe to previous subscriptions
          this.resubscribe();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  /**
   * Send message to WebSocket
   */
  private send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ method: type, subscription: payload }));
    } else {
      // Queue message for when connection is established
      this.messageQueue.push({ type, payload });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    const { channel, data } = message;

    const callbacks = this.subscriptions.get(channel);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Resubscribe to all active subscriptions
   */
  private resubscribe(): void {
    for (const channel of this.subscriptions.keys()) {
      // Parse channel to get subscription type and params
      if (channel === 'allMids') {
        this.send('subscribe', { type: 'allMids' });
      } else if (channel.startsWith('l2Book:')) {
        const coin = channel.split(':')[1];
        this.send('subscribe', { type: 'l2Book', coin });
      } else if (channel.startsWith('trades:')) {
        const coin = channel.split(':')[1];
        this.send('subscribe', { type: 'trades', coin });
      } else if (channel.startsWith('candle:')) {
        const [, coin, interval] = channel.split(':');
        this.send('subscribe', { type: 'candle', coin, interval });
      }
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting reconnect in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  /**
   * Subscribe to all mid prices
   */
  subscribeAllMids(callback: (data: MidsUpdate) => void): () => void {
    const channel = 'allMids';

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.send('subscribe', { type: 'allMids' });
    }

    this.subscriptions.get(channel)!.add(callback as MessageCallback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback as MessageCallback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.send('unsubscribe', { type: 'allMids' });
        }
      }
    };
  }

  /**
   * Subscribe to L2 order book updates
   */
  subscribeL2Book(coin: string, callback: (data: L2BookUpdate) => void): () => void {
    const channel = `l2Book:${coin}`;

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.send('subscribe', { type: 'l2Book', coin });
    }

    this.subscriptions.get(channel)!.add(callback as MessageCallback);

    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback as MessageCallback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.send('unsubscribe', { type: 'l2Book', coin });
        }
      }
    };
  }

  /**
   * Subscribe to trade updates
   */
  subscribeTrades(coin: string, callback: (data: TradeUpdate[]) => void): () => void {
    const channel = `trades:${coin}`;

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.send('subscribe', { type: 'trades', coin });
    }

    this.subscriptions.get(channel)!.add(callback as MessageCallback);

    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback as MessageCallback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.send('unsubscribe', { type: 'trades', coin });
        }
      }
    };
  }

  /**
   * Subscribe to candle updates
   */
  subscribeCandles(
    coin: string,
    interval: string,
    callback: (data: unknown) => void
  ): () => void {
    const channel = `candle:${coin}:${interval}`;

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.send('subscribe', { type: 'candle', coin, interval });
    }

    this.subscriptions.get(channel)!.add(callback);

    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          this.send('unsubscribe', { type: 'candle', coin, interval });
        }
      }
    };
  }
}

// Export singleton instance
export const hyperliquidWs = new HyperliquidWebSocket();

// Export class for custom instances
export { HyperliquidWebSocket };
