'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'analysis' | 'execution' | 'chat' | 'bonus';
  description: string | null;
  balanceAfter: number;
  createdAt: string;
}

interface CreditsState {
  credits: number;
  subscriptionTier: string;
  transactions: CreditTransaction[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for accessing user's credit balance and transactions
 */
export function useCredits() {
  const { authenticated, getAccessToken } = usePrivy();
  const [state, setState] = useState<CreditsState>({
    credits: 0,
    subscriptionTier: 'free',
    transactions: [],
    isLoading: true,
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!authenticated) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const token = await getAccessToken();
      const response = await fetch('/api/credits', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      setState({
        credits: data.credits,
        subscriptionTier: data.subscriptionTier,
        transactions: data.transactions,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch credits',
      }));
    }
  }, [authenticated, getAccessToken]);

  // Initial fetch
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Refresh credits (e.g., after purchase)
  const refreshCredits = useCallback(async () => {
    await fetchCredits();
  }, [fetchCredits]);

  // Update credits locally (for optimistic updates)
  const updateCredits = useCallback((newCredits: number) => {
    setState(prev => ({
      ...prev,
      credits: newCredits,
    }));
  }, []);

  return {
    ...state,
    refreshCredits,
    updateCredits,
  };
}
