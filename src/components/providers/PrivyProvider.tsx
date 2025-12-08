'use client';

import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyProviderProps {
  children: ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID not set, Privy disabled');
    return <>{children}</>;
  }

  return (
    <PrivyProviderBase
      appId={appId}
      config={{
        // Login methods
        loginMethods: ['email', 'wallet', 'google', 'twitter'],

        // Appearance
        appearance: {
          theme: 'dark',
          accentColor: '#ffffff',
          logo: '/logo.png',
          showWalletLoginFirst: false,
        },

        // Embedded wallets config - uses newer API structure
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },

        // Supported chains - Arbitrum for bridging, Hyperliquid L1 for trading
        supportedChains: [
          {
            id: 42161,
            name: 'Arbitrum One',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://arb1.arbitrum.io/rpc'] },
            },
            blockExplorers: {
              default: { name: 'Arbiscan', url: 'https://arbiscan.io' },
            },
          },
        ],
        defaultChain: {
          id: 42161,
          name: 'Arbitrum One',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: ['https://arb1.arbitrum.io/rpc'] },
          },
          blockExplorers: {
            default: { name: 'Arbiscan', url: 'https://arbiscan.io' },
          },
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
