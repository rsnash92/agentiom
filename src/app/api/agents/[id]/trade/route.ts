import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users, agentLogs, positions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { decryptPrivateKey } from '@/lib/crypto';
import { createServerTrader } from '@/lib/hyperliquid';
import type { Hex } from 'viem';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Validation schemas
const placeOrderSchema = z.object({
  action: z.literal('placeOrder'),
  coin: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  size: z.number().positive(),
  price: z.number().positive().optional(),
  orderType: z.enum(['limit', 'market']).default('market'),
  leverage: z.number().min(1).max(50).optional(),
  reduceOnly: z.boolean().optional(),
});

const closePositionSchema = z.object({
  action: z.literal('closePosition'),
  coin: z.string().min(1),
});

const cancelOrderSchema = z.object({
  action: z.literal('cancelOrder'),
  coin: z.string().min(1),
  orderId: z.string().min(1),
});

const getAccountSchema = z.object({
  action: z.literal('getAccount'),
});

const tradeActionSchema = z.discriminatedUnion('action', [
  placeOrderSchema,
  closePositionSchema,
  cancelOrderSchema,
  getAccountSchema,
]);

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

// POST /api/agents/[id]/trade - Execute trading actions
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent and verify ownership
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Parse and validate action
    const body = await request.json();
    const validationResult = tradeActionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const action = validationResult.data;

    // Decrypt agent's private key and create trader
    let privateKey: Hex;
    try {
      privateKey = decryptPrivateKey(agent.apiKeyEncrypted) as Hex;
    } catch {
      return NextResponse.json(
        { error: 'Failed to decrypt agent credentials' },
        { status: 500 }
      );
    }

    const trader = createServerTrader(privateKey, process.env.HYPERLIQUID_NETWORK === 'testnet');

    // Execute the action
    switch (action.action) {
      case 'placeOrder': {
        // Validate against agent policies
        const policies = agent.policies as {
          maxLeverage: number;
          maxPositionSizeUsd: number;
          approvedPairs: string[];
        };

        if (!policies.approvedPairs.includes(action.coin)) {
          return NextResponse.json(
            { error: `Trading ${action.coin} is not allowed by agent policies` },
            { status: 400 }
          );
        }

        if (action.leverage && action.leverage > policies.maxLeverage) {
          return NextResponse.json(
            { error: `Leverage ${action.leverage}x exceeds max ${policies.maxLeverage}x` },
            { status: 400 }
          );
        }

        // Get current price to check position size
        const markPrice = await trader.getMarkPrice(action.coin);
        if (markPrice) {
          const positionSizeUsd = action.size * markPrice;
          if (positionSizeUsd > policies.maxPositionSizeUsd) {
            return NextResponse.json(
              { error: `Position size $${positionSizeUsd.toFixed(2)} exceeds max $${policies.maxPositionSizeUsd}` },
              { status: 400 }
            );
          }
        }

        const result = await trader.placeOrder({
          coin: action.coin,
          side: action.side,
          size: action.size,
          price: action.price,
          orderType: action.orderType,
          leverage: action.leverage,
          reduceOnly: action.reduceOnly,
        });

        // Log the trade
        await db.insert(agentLogs).values({
          agentId: agent.id,
          logType: 'execution',
          symbol: action.coin,
          content: `${action.side.toUpperCase()} ${action.size} ${action.coin} @ ${action.orderType}`,
          decision: {
            action: action.side,
            symbol: action.coin,
            confidence: 100,
            sizeUsd: action.size * (markPrice || 0),
            leverage: action.leverage || 1,
            reasoning: 'Manual trade execution',
            marketContext: '',
          },
        });

        // If order was filled, create/update position record
        if (result.success && result.status === 'filled' && result.avgPrice) {
          await db.insert(positions).values({
            agentId: agent.id,
            symbol: action.coin,
            side: action.side === 'buy' ? 'long' : 'short',
            size: result.filledSize?.toString() || action.size.toString(),
            sizeUsd: ((result.filledSize || action.size) * result.avgPrice).toString(),
            entryPrice: result.avgPrice.toString(),
            leverage: (action.leverage || 1).toString(),
            entryReasoning: 'Manual trade',
          });
        }

        return NextResponse.json({ result });
      }

      case 'closePosition': {
        const result = await trader.closePosition(action.coin);

        if (result.success) {
          // Mark position as closed in database
          await db
            .update(positions)
            .set({
              status: 'closed',
              closedAt: new Date(),
              exitReasoning: 'Manual close',
            })
            .where(
              and(
                eq(positions.agentId, agent.id),
                eq(positions.symbol, action.coin),
                eq(positions.status, 'open')
              )
            );

          await db.insert(agentLogs).values({
            agentId: agent.id,
            logType: 'execution',
            symbol: action.coin,
            content: `Closed position in ${action.coin}`,
          });
        }

        return NextResponse.json({ result });
      }

      case 'cancelOrder': {
        const result = await trader.cancelOrder(action.coin, action.orderId);
        return NextResponse.json({ result });
      }

      case 'getAccount': {
        const accountState = await trader.getAccountState();
        return NextResponse.json({ account: accountState });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Trade execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}

// GET /api/agents/[id]/trade - Get agent's trading account state
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Decrypt and create trader
    let privateKey: Hex;
    try {
      privateKey = decryptPrivateKey(agent.apiKeyEncrypted) as Hex;
    } catch {
      return NextResponse.json(
        { error: 'Failed to decrypt agent credentials' },
        { status: 500 }
      );
    }

    const trader = createServerTrader(privateKey, process.env.HYPERLIQUID_NETWORK === 'testnet');
    const accountState = await trader.getAccountState();

    return NextResponse.json({ account: accountState });
  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}
