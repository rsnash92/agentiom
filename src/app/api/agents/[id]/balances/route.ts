import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { arbitrum } from 'viem/chains';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// USDC contract on Arbitrum
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Create Arbitrum client
const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyUser = await privy.getUser(verifiedClaims.userId);

    if (!privyUser.wallet?.address) return null;

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, privyUser.wallet.address))
      .limit(1);

    return dbUser || null;
  } catch (error) {
    console.error('getUserFromToken error:', error);
    return null;
  }
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/agents/[id]/balances - Get agent wallet balances
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const walletAddress = agent.walletAddress as `0x${string}`;

    // Fetch balances in parallel
    const [arbitrumEthBalance, arbitrumUsdcBalance, hyperliquidState] = await Promise.all([
      // Arbitrum ETH balance
      arbitrumClient.getBalance({ address: walletAddress }).catch(() => BigInt(0)),

      // Arbitrum USDC balance
      arbitrumClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      }).catch(() => BigInt(0)),

      // Hyperliquid balance (via their API)
      fetchHyperliquidBalance(walletAddress).catch(() => null),
    ]);

    const balances = {
      arbitrumEth: parseFloat(formatEther(arbitrumEthBalance)),
      arbitrumUsdc: parseFloat(formatUnits(arbitrumUsdcBalance, 6)), // USDC has 6 decimals
      hyperliquidUsdc: hyperliquidState?.accountValue || 0,
    };

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Get balances error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}

// Fetch Hyperliquid account balance
async function fetchHyperliquidBalance(address: string): Promise<{ accountValue: number } | null> {
  try {
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data?.crossMarginSummary?.accountValue) {
      return {
        accountValue: parseFloat(data.crossMarginSummary.accountValue),
      };
    }

    return { accountValue: 0 };
  } catch {
    return null;
  }
}
