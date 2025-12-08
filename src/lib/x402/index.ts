/**
 * x402 Payment Protocol Integration
 *
 * Implements HTTP 402 "Payment Required" micropayment flow:
 * 1. Client requests paid endpoint
 * 2. Server responds with 402 + payment instructions
 * 3. Client pays on-chain (USDC on Base/Arbitrum)
 * 4. Client retries with X-PAYMENT header
 * 5. Server verifies and delivers resource
 */

export interface X402PaymentRequest {
  // Amount in smallest units (e.g., USDC has 6 decimals)
  amount: string;
  // Asset contract address
  asset: string;
  // Chain ID (Base = 8453, Arbitrum = 42161)
  chainId: number;
  // Receiver address
  receiver: string;
  // Optional: deadline for payment
  deadline?: number;
  // Optional: unique payment ID
  paymentId?: string;
}

export interface X402PaymentResponse {
  // Transaction hash of payment
  txHash: string;
  // Chain ID where payment was made
  chainId: number;
  // Amount paid
  amount: string;
}

/**
 * Parse x402 payment requirements from response headers
 */
export function parseX402Response(headers: Headers): X402PaymentRequest | null {
  const paymentHeader = headers.get('X-Payment-Required');
  if (!paymentHeader) return null;

  try {
    return JSON.parse(paymentHeader) as X402PaymentRequest;
  } catch {
    return null;
  }
}

/**
 * Create X-PAYMENT header for payment proof
 */
export function createPaymentHeader(payment: X402PaymentResponse): string {
  return JSON.stringify(payment);
}

/**
 * USDC contract addresses by chain
 */
export const USDC_ADDRESSES: Record<number, string> = {
  // Base
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  // Arbitrum One
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

/**
 * x402 payment configuration for Agentiom
 */
export const X402_CONFIG = {
  // Default receiver address (platform fee wallet)
  receiverAddress: process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS,

  // Supported chains for payment
  supportedChains: [8453, 42161], // Base, Arbitrum

  // Default chain (Base for lower fees)
  defaultChain: 8453,

  // Payment types and their prices (in USDC, 6 decimals)
  prices: {
    // One-time agent creation fee
    agentCreation: '5000000', // $5 USDC

    // Monthly subscription for premium features
    premiumMonthly: '20000000', // $20 USDC

    // Per-trade fee for copy trading
    copyTradeFee: '100000', // $0.10 USDC

    // Strategy purchase (one-time)
    strategyPurchase: '10000000', // $10 USDC
  },
};

/**
 * Create payment request for a specific action
 */
export function createPaymentRequest(
  action: keyof typeof X402_CONFIG.prices,
  receiver?: string
): X402PaymentRequest {
  const amount = X402_CONFIG.prices[action];
  const chainId = X402_CONFIG.defaultChain;

  return {
    amount,
    asset: USDC_ADDRESSES[chainId],
    chainId,
    receiver: receiver || X402_CONFIG.receiverAddress || '',
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    paymentId: `${action}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

/**
 * Verify payment on-chain (server-side)
 */
export async function verifyPayment(
  payment: X402PaymentResponse,
  expected: X402PaymentRequest
): Promise<boolean> {
  // TODO: Implement actual on-chain verification
  // 1. Fetch transaction receipt
  // 2. Verify amount, receiver, and asset match
  // 3. Verify transaction is finalized

  console.log('Verifying payment:', payment, 'Expected:', expected);

  // Placeholder - implement with viem/ethers
  return true;
}

/**
 * API route helper to return 402 response
 */
export function createX402Response(
  paymentRequest: X402PaymentRequest,
  message = 'Payment Required'
): Response {
  return new Response(JSON.stringify({ error: message, payment: paymentRequest }), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'X-Payment-Required': JSON.stringify(paymentRequest),
    },
  });
}
