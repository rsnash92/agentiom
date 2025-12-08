'use client';

import { useCallback, useState, useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { type Address } from 'viem';
import {
  createAgentTrader,
  type PlaceOrderParams,
  type OrderResult,
  type AccountSummary,
  type HyperliquidTrader,
} from '@/lib/hyperliquid';

/**
 * Hook for executing trades on Hyperliquid using agent wallets
 */
export function useAgentTrading(agentWalletAddress?: Address) {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the agent's wallet from Privy wallets
  const agentWallet = useMemo(() => {
    if (!agentWalletAddress) return null;
    return wallets.find(
      (w) => w.address.toLowerCase() === agentWalletAddress.toLowerCase()
    );
  }, [wallets, agentWalletAddress]);

  /**
   * Create a sign message function for the agent wallet
   */
  const createSignFunction = useCallback(async () => {
    if (!agentWallet) {
      throw new Error('Agent wallet not found');
    }

    const provider = await agentWallet.getEthereumProvider();

    return async (message: string): Promise<string> => {
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, agentWallet.address],
      });
      return signature as string;
    };
  }, [agentWallet]);

  /**
   * Get a trader instance for the agent
   */
  const getTrader = useCallback(async (): Promise<HyperliquidTrader | null> => {
    if (!agentWalletAddress) {
      setError('No agent wallet address provided');
      return null;
    }

    try {
      const signMessage = await createSignFunction();
      return createAgentTrader(agentWalletAddress, signMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create trader';
      setError(message);
      return null;
    }
  }, [agentWalletAddress, createSignFunction]);

  /**
   * Place an order for the agent
   */
  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<OrderResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const trader = await getTrader();
      if (!trader) {
        return { success: false, error: 'Failed to initialize trader' };
      }

      const result = await trader.placeOrder(params);

      if (!result.success) {
        setError(result.error || 'Order failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [getTrader]);

  /**
   * Cancel an order
   */
  const cancelOrder = useCallback(async (coin: string, orderId: string): Promise<OrderResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const trader = await getTrader();
      if (!trader) {
        return { success: false, error: 'Failed to initialize trader' };
      }

      const result = await trader.cancelOrder({ coin, orderId });

      if (!result.success) {
        setError(result.error || 'Cancel failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [getTrader]);

  /**
   * Get agent's account summary including positions
   */
  const getAccountSummary = useCallback(async (): Promise<AccountSummary | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const trader = await getTrader();
      if (!trader) {
        return null;
      }

      return await trader.getAccountSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch account';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getTrader]);

  /**
   * Set leverage for a coin
   */
  const setLeverage = useCallback(async (coin: string, leverage: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const trader = await getTrader();
      if (!trader) {
        return false;
      }

      const success = await trader.setLeverage(coin, leverage);

      if (!success) {
        setError('Failed to set leverage');
      }

      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set leverage';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getTrader]);

  /**
   * Quick market buy
   */
  const marketBuy = useCallback(async (coin: string, size: number): Promise<OrderResult> => {
    return placeOrder({
      coin,
      side: 'buy',
      size,
      orderType: 'market',
    });
  }, [placeOrder]);

  /**
   * Quick market sell
   */
  const marketSell = useCallback(async (coin: string, size: number): Promise<OrderResult> => {
    return placeOrder({
      coin,
      side: 'sell',
      size,
      orderType: 'market',
    });
  }, [placeOrder]);

  /**
   * Close position by placing opposite market order
   */
  const closePosition = useCallback(async (coin: string, size: number, side: 'long' | 'short'): Promise<OrderResult> => {
    return placeOrder({
      coin,
      side: side === 'long' ? 'sell' : 'buy',
      size,
      orderType: 'market',
      reduceOnly: true,
    });
  }, [placeOrder]);

  return {
    // State
    isLoading,
    error,
    agentWallet,
    isWalletAvailable: !!agentWallet,

    // Trading functions
    placeOrder,
    cancelOrder,
    getAccountSummary,
    setLeverage,

    // Quick actions
    marketBuy,
    marketSell,
    closePosition,
  };
}
