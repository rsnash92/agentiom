import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { base, arbitrum } from 'viem/chains';
import { USDC_ADDRESSES, type X402PaymentResponse, type X402PaymentRequest } from '@/lib/x402';

// ERC-20 Transfer event ABI
const erc20TransferEvent = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

/**
 * Verify an x402 payment on-chain
 * POST /api/x402/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment, expected } = body as {
      payment: X402PaymentResponse;
      expected: X402PaymentRequest;
    };

    if (!payment || !expected) {
      return NextResponse.json(
        { error: 'Missing payment or expected fields' },
        { status: 400 }
      );
    }

    // Create client for the payment chain
    const chain = payment.chainId === 8453 ? base : arbitrum;
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Fetch transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: payment.txHash as `0x${string}`,
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Transaction not found', verified: false },
        { status: 400 }
      );
    }

    // Check transaction status
    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction failed', verified: false },
        { status: 400 }
      );
    }

    // Parse Transfer events from logs
    const expectedAsset = USDC_ADDRESSES[payment.chainId];
    let transferFound = false;
    let transferAmount = BigInt(0);

    for (const log of receipt.logs) {
      // Check if this is a Transfer event from USDC contract
      if (log.address.toLowerCase() === expectedAsset?.toLowerCase()) {
        // Transfer event topic0: keccak256("Transfer(address,address,uint256)")
        const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

        if (log.topics[0] === transferTopic) {
          // Decode receiver address from topic2
          const toAddress = `0x${log.topics[2]?.slice(-40)}` as Address;

          if (toAddress.toLowerCase() === expected.receiver.toLowerCase()) {
            // Decode amount from data
            transferAmount = BigInt(log.data);
            transferFound = true;
            break;
          }
        }
      }
    }

    if (!transferFound) {
      return NextResponse.json(
        { error: 'Transfer to receiver not found', verified: false },
        { status: 400 }
      );
    }

    // Verify amount
    if (transferAmount < BigInt(expected.amount)) {
      return NextResponse.json(
        {
          error: 'Insufficient payment amount',
          expected: expected.amount,
          received: transferAmount.toString(),
          verified: false,
        },
        { status: 400 }
      );
    }

    // Verify chain ID matches
    if (payment.chainId !== expected.chainId) {
      return NextResponse.json(
        { error: 'Chain ID mismatch', verified: false },
        { status: 400 }
      );
    }

    // All checks passed
    return NextResponse.json({
      verified: true,
      txHash: payment.txHash,
      amount: transferAmount.toString(),
      chainId: payment.chainId,
      blockNumber: Number(receipt.blockNumber),
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', verified: false },
      { status: 500 }
    );
  }
}
