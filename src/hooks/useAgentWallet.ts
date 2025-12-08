'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';

export interface AgentWallet {
  address: string;
  type: 'embedded' | 'external';
}

/**
 * Hook for managing agent wallets with Privy
 * Supports creating embedded wallets for each agent
 */
export function useAgentWallet() {
  const { ready, authenticated, user, createWallet } = usePrivy();
  const { wallets } = useWallets();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user's primary wallet (for funding agents)
  const primaryWallet = wallets.find((w) => w.walletClientType === 'privy') || wallets[0];

  // Get all embedded wallets (potential agent wallets)
  const embeddedWallets = wallets.filter((w) => w.walletClientType === 'privy');

  /**
   * Create a new embedded wallet for an agent
   * Each agent gets its own dedicated wallet
   */
  const createAgentWallet = useCallback(async (): Promise<AgentWallet | null> => {
    if (!authenticated) {
      setError('Please connect your wallet first');
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Privy's createWallet creates a new embedded wallet
      const wallet = await createWallet();

      if (!wallet) {
        throw new Error('Failed to create wallet');
      }

      return {
        address: wallet.address,
        type: 'embedded',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create agent wallet';
      setError(message);
      console.error('Error creating agent wallet:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [authenticated, createWallet]);

  /**
   * Get wallet by address
   */
  const getWallet = useCallback(
    (address: string) => {
      return wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
    },
    [wallets]
  );

  /**
   * Sign a message with a specific wallet
   */
  const signMessage = useCallback(
    async (walletAddress: string, message: string): Promise<string | null> => {
      const wallet = getWallet(walletAddress);
      if (!wallet) {
        setError('Wallet not found');
        return null;
      }

      try {
        const provider = await wallet.getEthereumProvider();
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, walletAddress],
        });
        return signature as string;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign message';
        setError(message);
        return null;
      }
    },
    [getWallet]
  );

  return {
    ready,
    authenticated,
    user,
    primaryWallet,
    embeddedWallets,
    allWallets: wallets,
    createAgentWallet,
    getWallet,
    signMessage,
    isCreating,
    error,
  };
}
