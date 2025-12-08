'use client';

import { useCallback, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom, type Address } from 'viem';
import { arbitrum } from 'viem/chains';
import { AgentRegistryABI, ReputationRegistryABI, CONTRACT_ADDRESSES } from '@/lib/contracts/abis';

export interface AgentInfo {
  tokenId: bigint;
  walletAddress: Address;
  creator: Address;
  createdAt: bigint;
  isActive: boolean;
  strategyType: string;
}

export interface ReputationData {
  totalPnL: bigint;
  totalTrades: bigint;
  winningTrades: bigint;
  totalVolume: bigint;
  maxDrawdown: bigint;
  sharpeRatio: bigint;
  lastUpdateTime: bigint;
  ratingCount: bigint;
  totalRating: bigint;
}

/**
 * Hook for interacting with ERC-8004 Agent Registry contracts
 */
export function useAgentRegistry() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get primary wallet for transactions
  const primaryWallet = wallets[0];

  // Public client for read operations
  const publicClient = createPublicClient({
    chain: arbitrum,
    transport: http(),
  });

  /**
   * Get a wallet client for write operations
   */
  const getWalletClient = useCallback(async () => {
    if (!primaryWallet) {
      throw new Error('No wallet connected');
    }

    const provider = await primaryWallet.getEthereumProvider();

    return createWalletClient({
      chain: arbitrum,
      transport: custom(provider),
      account: primaryWallet.address as Address,
    });
  }, [primaryWallet]);

  /**
   * Register a new agent on-chain (mint NFT)
   */
  const registerAgent = useCallback(async (
    agentWalletAddress: Address,
    metadataURI: string,
    strategyType: string
  ): Promise<bigint | null> => {
    if (!authenticated) {
      setError('Please connect your wallet first');
      return null;
    }

    if (!CONTRACT_ADDRESSES.agentRegistry) {
      setError('Agent Registry contract not configured');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = await getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'registerAgent',
        args: [agentWalletAddress, metadataURI, strategyType],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse logs to get tokenId from AgentCreated event
      const agentCreatedLog = receipt.logs.find(log => {
        try {
          // Check for AgentCreated event signature
          return log.topics[0] === '0x...' // Would be actual event signature
        } catch {
          return false;
        }
      });

      // For now, return a placeholder - in production would parse from event
      console.log('Agent registered, tx hash:', hash);

      return BigInt(1); // Placeholder
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register agent';
      setError(message);
      console.error('Error registering agent:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, getWalletClient, publicClient]);

  /**
   * Get agent info by token ID
   */
  const getAgent = useCallback(async (tokenId: bigint): Promise<AgentInfo | null> => {
    if (!CONTRACT_ADDRESSES.agentRegistry) {
      return null;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'getAgent',
        args: [tokenId],
      }) as unknown as {
        walletAddress: Address;
        creator: Address;
        createdAt: bigint;
        isActive: boolean;
        strategyType: string;
      };

      return {
        tokenId,
        walletAddress: result.walletAddress,
        creator: result.creator,
        createdAt: result.createdAt,
        isActive: result.isActive,
        strategyType: result.strategyType,
      };
    } catch (err) {
      console.error('Error fetching agent:', err);
      return null;
    }
  }, [publicClient]);

  /**
   * Get agent by wallet address
   */
  const getAgentByWallet = useCallback(async (walletAddress: Address): Promise<bigint | null> => {
    if (!CONTRACT_ADDRESSES.agentRegistry) {
      return null;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'getAgentByWallet',
        args: [walletAddress],
      }) as bigint;

      return result > BigInt(0) ? result : null;
    } catch (err) {
      console.error('Error fetching agent by wallet:', err);
      return null;
    }
  }, [publicClient]);

  /**
   * Check if wallet is already registered
   */
  const isWalletRegistered = useCallback(async (walletAddress: Address): Promise<boolean> => {
    if (!CONTRACT_ADDRESSES.agentRegistry) {
      return false;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'isWalletRegistered',
        args: [walletAddress],
      }) as boolean;

      return result;
    } catch (err) {
      console.error('Error checking wallet registration:', err);
      return false;
    }
  }, [publicClient]);

  /**
   * Activate an agent
   */
  const activateAgent = useCallback(async (tokenId: bigint): Promise<boolean> => {
    if (!authenticated || !CONTRACT_ADDRESSES.agentRegistry) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = await getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'activateAgent',
        args: [tokenId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate agent';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, getWalletClient, publicClient]);

  /**
   * Deactivate an agent
   */
  const deactivateAgent = useCallback(async (tokenId: bigint): Promise<boolean> => {
    if (!authenticated || !CONTRACT_ADDRESSES.agentRegistry) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = await getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'deactivateAgent',
        args: [tokenId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate agent';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, getWalletClient, publicClient]);

  /**
   * Get reputation data for an agent
   */
  const getReputation = useCallback(async (agentId: bigint): Promise<ReputationData | null> => {
    if (!CONTRACT_ADDRESSES.reputationRegistry) {
      return null;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.reputationRegistry,
        abi: ReputationRegistryABI,
        functionName: 'getReputation',
        args: [agentId],
      }) as unknown as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];

      return {
        totalPnL: result[0],
        totalTrades: result[1],
        winningTrades: result[2],
        totalVolume: result[3],
        maxDrawdown: result[4],
        sharpeRatio: result[5],
        lastUpdateTime: result[6],
        ratingCount: result[7],
        totalRating: result[8],
      };
    } catch (err) {
      console.error('Error fetching reputation:', err);
      return null;
    }
  }, [publicClient]);

  /**
   * Get reputation score (0-100)
   */
  const getReputationScore = useCallback(async (agentId: bigint): Promise<number> => {
    if (!CONTRACT_ADDRESSES.reputationRegistry) {
      return 0;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.reputationRegistry,
        abi: ReputationRegistryABI,
        functionName: 'getReputationScore',
        args: [agentId],
      }) as bigint;

      return Number(result);
    } catch (err) {
      console.error('Error fetching reputation score:', err);
      return 0;
    }
  }, [publicClient]);

  /**
   * Submit a rating for an agent (1-5)
   */
  const submitRating = useCallback(async (agentId: bigint, rating: number): Promise<boolean> => {
    if (!authenticated || !CONTRACT_ADDRESSES.reputationRegistry) {
      return false;
    }

    if (rating < 1 || rating > 5) {
      setError('Rating must be between 1 and 5');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletClient = await getWalletClient();

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.reputationRegistry,
        abi: ReputationRegistryABI,
        functionName: 'submitRating',
        args: [agentId, rating],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit rating';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, getWalletClient, publicClient]);

  /**
   * Get total number of registered agents
   */
  const getTotalAgents = useCallback(async (): Promise<number> => {
    if (!CONTRACT_ADDRESSES.agentRegistry) {
      return 0;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.agentRegistry,
        abi: AgentRegistryABI,
        functionName: 'totalAgents',
      }) as bigint;

      return Number(result);
    } catch (err) {
      console.error('Error fetching total agents:', err);
      return 0;
    }
  }, [publicClient]);

  return {
    // State
    isLoading,
    error,

    // Agent Registry
    registerAgent,
    getAgent,
    getAgentByWallet,
    isWalletRegistered,
    activateAgent,
    deactivateAgent,
    getTotalAgents,

    // Reputation Registry
    getReputation,
    getReputationScore,
    submitRating,
  };
}
