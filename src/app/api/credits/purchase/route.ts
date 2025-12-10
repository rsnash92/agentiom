import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { createPublicClient, http, type Address } from 'viem';
import { base, arbitrum } from 'viem/chains';
import { db } from '@/lib/db';
import { users, creditTransactions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { USDC_ADDRESSES } from '@/lib/x402';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Track processed transactions to prevent double-spending
const processedTxHashes = new Set<string>();

interface PurchaseRequest {
  txHash: string;
  chainId: number;
  amount: string;
  credits: number;
  packageId: string;
}

/**
 * POST /api/credits/purchase
 * Verify payment and grant credits to user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyUser = await privy.getUser(verifiedClaims.userId);
    const walletAddress = privyUser.wallet?.address;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'User must have a wallet connected' },
        { status: 400 }
      );
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body: PurchaseRequest = await request.json();
    const { txHash, chainId, amount, credits, packageId } = body;

    if (!txHash || !chainId || !amount || !credits) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for duplicate transaction (idempotency)
    if (processedTxHashes.has(txHash)) {
      return NextResponse.json(
        { error: 'Transaction already processed' },
        { status: 409 }
      );
    }

    // Verify the payment on-chain
    const verificationResult = await verifyPaymentOnChain(txHash, chainId, amount);

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 400 }
      );
    }

    // Mark transaction as processed
    processedTxHashes.add(txHash);

    // Calculate new balance
    const newBalance = user.credits + credits;

    // Update user credits and create transaction record
    await db.transaction(async (tx) => {
      // Update user credits
      await tx
        .update(users)
        .set({
          credits: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Create credit transaction record
      await tx.insert(creditTransactions).values({
        userId: user.id,
        amount: credits,
        type: 'purchase',
        description: `Purchased ${credits.toLocaleString()} credits (${packageId}) via ${chainId === 8453 ? 'Base' : 'Arbitrum'}`,
        balanceAfter: newBalance,
      });
    });

    return NextResponse.json({
      success: true,
      credits,
      newBalance,
      txHash,
      message: `Successfully purchased ${credits.toLocaleString()} credits`,
    });

  } catch (error) {
    console.error('Credit purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to process credit purchase' },
      { status: 500 }
    );
  }
}

/**
 * Verify payment on-chain
 */
async function verifyPaymentOnChain(
  txHash: string,
  chainId: number,
  expectedAmount: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const chain = chainId === 8453 ? base : arbitrum;
    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Fetch transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return { success: false, error: 'Transaction not found' };
    }

    if (receipt.status !== 'success') {
      return { success: false, error: 'Transaction failed' };
    }

    // Parse Transfer events from logs
    const expectedAsset = USDC_ADDRESSES[chainId];
    const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS?.toLowerCase();

    if (!receiverAddress) {
      return { success: false, error: 'Receiver address not configured' };
    }

    let transferFound = false;
    let transferAmount = BigInt(0);

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === expectedAsset?.toLowerCase()) {
        // Transfer event topic
        const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

        if (log.topics[0] === transferTopic) {
          const toAddress = `0x${log.topics[2]?.slice(-40)}`.toLowerCase();

          if (toAddress === receiverAddress) {
            transferAmount = BigInt(log.data);
            transferFound = true;
            break;
          }
        }
      }
    }

    if (!transferFound) {
      return { success: false, error: 'Transfer to receiver not found' };
    }

    // Verify amount (allow 0.1% slippage for rounding)
    const expectedBigInt = BigInt(expectedAmount);
    const tolerance = expectedBigInt / BigInt(1000); // 0.1%

    if (transferAmount < expectedBigInt - tolerance) {
      return {
        success: false,
        error: `Insufficient payment: expected ${expectedAmount}, received ${transferAmount.toString()}`,
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Payment verification error:', error);
    return { success: false, error: 'Failed to verify payment on-chain' };
  }
}
