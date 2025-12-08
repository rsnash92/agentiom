'use client';

import { usePrivy, usePrivyWalletAddress } from '@privy-io/react-auth';
import { useMemo, useEffect, useCallback, useState } from 'react';

export interface AuthUser {
  id: string;
  email?: string;
  walletAddress?: string;
  displayName: string;
  isEmailVerified: boolean;
  hasWallet: boolean;
}

export interface DbUser {
  id: string;
  walletAddress: string;
  email?: string | null;
  credits: number;
  subscriptionTier: string;
  createdAt: string;
  updatedAt: string;
}

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    linkEmail,
    linkWallet,
    exportWallet,
    getAccessToken,
  } = usePrivy();

  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const authUser = useMemo<AuthUser | null>(() => {
    if (!authenticated || !user) return null;

    const walletAddress = user.wallet?.address;
    const email = user.email?.address;

    return {
      id: user.id,
      email,
      walletAddress,
      displayName:
        email?.split('@')[0] ||
        (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User'),
      isEmailVerified: !!user.email?.address,
      hasWallet: !!walletAddress,
    };
  }, [authenticated, user]);

  // Sync user to database when authenticated
  const syncUser = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    setIsSyncing(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDbUser(data.user);
      }
    } catch (error) {
      console.error('Failed to sync user:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [authenticated, user?.wallet?.address, getAccessToken]);

  // Sync on auth state change
  useEffect(() => {
    if (authenticated && user?.wallet?.address && !dbUser) {
      syncUser();
    }
    if (!authenticated) {
      setDbUser(null);
    }
  }, [authenticated, user?.wallet?.address, syncUser, dbUser]);

  return {
    // State
    ready,
    authenticated,
    user: authUser,
    dbUser, // Database user with credits, subscription, etc.

    // Actions
    login,
    logout,
    linkEmail,
    linkWallet,
    exportWallet,
    syncUser,
    getAccessToken, // For API calls that need authentication

    // Computed
    isLoading: !ready,
    isSyncing,
    isLoggedIn: authenticated && !!user,
    credits: dbUser?.credits ?? 0,
    subscriptionTier: dbUser?.subscriptionTier ?? 'free',
  };
}
