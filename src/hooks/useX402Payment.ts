'use client';

import { useCallback, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseUnits, type Address, encodeFunctionData } from 'viem';
import { base, arbitrum } from 'viem/chains';
import {
  type X402PaymentRequest,
  type X402PaymentResponse,
  createPaymentRequest,
  USDC_ADDRESSES,
  X402_CONFIG,
} from '@/lib/x402';

// ERC-20 transfer function ABI
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

export type PaymentAction = keyof typeof X402_CONFIG.prices;

export interface PaymentResult {
  success: boolean;
  payment?: X402PaymentResponse;
  error?: string;
}

/**
 * Hook for making x402 micropayments
 */
export function useX402Payment() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get primary wallet for payments
  const primaryWallet = wallets[0];

  /**
   * Get a wallet client for the specified chain
   */
  const getWalletClient = useCallback(async (chainId: number) => {
    if (!primaryWallet) {
      throw new Error('No wallet connected');
    }

    const chain = chainId === 8453 ? base : arbitrum;
    const provider = await primaryWallet.getEthereumProvider();

    // Switch chain if needed
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: unknown) {
      // Chain not added, try to add it
      if ((switchError as { code?: number })?.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrls.default.http[0]],
            blockExplorerUrls: [chain.blockExplorers?.default?.url],
          }],
        });
      } else {
        throw switchError;
      }
    }

    return createWalletClient({
      chain,
      transport: custom(provider),
      account: primaryWallet.address as Address,
    });
  }, [primaryWallet]);

  /**
   * Make a payment for a specific action
   */
  const pay = useCallback(async (
    action: PaymentAction,
    customReceiver?: Address
  ): Promise<PaymentResult> => {
    if (!authenticated) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!primaryWallet) {
      return { success: false, error: 'No wallet connected' };
    }

    setIsPaying(true);
    setError(null);

    try {
      // Create payment request
      const paymentRequest = createPaymentRequest(action, customReceiver);
      const { amount, asset, chainId, receiver } = paymentRequest;

      // Get wallet client
      const walletClient = await getWalletClient(chainId);

      // Encode transfer call
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [receiver as Address, BigInt(amount)],
      });

      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: asset as Address,
        data,
        chain: chainId === 8453 ? base : arbitrum,
      });

      const payment: X402PaymentResponse = {
        txHash: hash,
        chainId,
        amount,
      };

      // Verify payment on server
      const verifyResponse = await fetch('/api/x402/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment, expected: paymentRequest }),
      });

      if (!verifyResponse.ok) {
        const verifyError = await verifyResponse.json();
        return {
          success: false,
          error: verifyError.error || 'Payment verification failed',
          payment,
        };
      }

      return { success: true, payment };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      console.error('Payment error:', err);
      return { success: false, error: message };
    } finally {
      setIsPaying(false);
    }
  }, [authenticated, primaryWallet, getWalletClient]);

  /**
   * Make a custom payment with specific amount
   */
  const payCustom = useCallback(async (
    amountUSDC: number,
    receiver: Address,
    chainId: number = X402_CONFIG.defaultChain
  ): Promise<PaymentResult> => {
    if (!authenticated) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!primaryWallet) {
      return { success: false, error: 'No wallet connected' };
    }

    setIsPaying(true);
    setError(null);

    try {
      // Convert to USDC units (6 decimals)
      const amount = parseUnits(amountUSDC.toString(), 6).toString();
      const asset = USDC_ADDRESSES[chainId];

      if (!asset) {
        return { success: false, error: 'Unsupported chain' };
      }

      // Get wallet client
      const walletClient = await getWalletClient(chainId);

      // Encode transfer call
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [receiver, BigInt(amount)],
      });

      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: asset as Address,
        data,
        chain: chainId === 8453 ? base : arbitrum,
      });

      const payment: X402PaymentResponse = {
        txHash: hash,
        chainId,
        amount,
      };

      return { success: true, payment };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      console.error('Payment error:', err);
      return { success: false, error: message };
    } finally {
      setIsPaying(false);
    }
  }, [authenticated, primaryWallet, getWalletClient]);

  /**
   * Get price for an action in USDC
   */
  const getPrice = useCallback((action: PaymentAction): number => {
    const priceRaw = X402_CONFIG.prices[action];
    return Number(priceRaw) / 1_000_000; // Convert from 6 decimals
  }, []);

  /**
   * Check if user can afford a payment (requires balance check)
   */
  const checkBalance = useCallback(async (action: PaymentAction): Promise<boolean> => {
    // TODO: Implement balance check with USDC contract
    // For now, return true and let the transaction fail if insufficient
    return true;
  }, []);

  return {
    pay,
    payCustom,
    getPrice,
    checkBalance,
    isPaying,
    error,
    primaryWallet,
    authenticated,
  };
}
