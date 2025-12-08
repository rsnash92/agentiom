import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, users, llmUsage } from '@/lib/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

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

// GET /api/agents/[id]/llm-usage - Get agent LLM usage stats
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, user.id)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '24h'; // '24h', '7d', '30d', 'all'

    // Calculate date filter
    let dateFilter: Date | null = null;
    switch (period) {
      case '24h':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get aggregated stats
    const statsQuery = db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalInputTokens: sql<number>`sum(${llmUsage.inputTokens})::int`,
        totalOutputTokens: sql<number>`sum(${llmUsage.outputTokens})::int`,
        totalCost: sql<number>`sum(${llmUsage.costUsd})::numeric`,
        avgLatency: sql<number>`avg(${llmUsage.latencyMs})::int`,
        successRate: sql<number>`(count(*) filter (where ${llmUsage.success} = true)::float / nullif(count(*), 0) * 100)::numeric`,
      })
      .from(llmUsage)
      .where(
        dateFilter
          ? and(eq(llmUsage.agentId, id), gte(llmUsage.createdAt, dateFilter))
          : eq(llmUsage.agentId, id)
      );

    const [stats] = await statsQuery;

    // Get usage by model
    const byModelQuery = db
      .select({
        model: llmUsage.model,
        provider: llmUsage.provider,
        calls: sql<number>`count(*)::int`,
        cost: sql<number>`sum(${llmUsage.costUsd})::numeric`,
        avgLatency: sql<number>`avg(${llmUsage.latencyMs})::int`,
      })
      .from(llmUsage)
      .where(
        dateFilter
          ? and(eq(llmUsage.agentId, id), gte(llmUsage.createdAt, dateFilter))
          : eq(llmUsage.agentId, id)
      )
      .groupBy(llmUsage.model, llmUsage.provider)
      .orderBy(desc(sql`count(*)`));

    const byModel = await byModelQuery;

    // Get usage by task type
    const byTaskQuery = db
      .select({
        taskType: llmUsage.taskType,
        calls: sql<number>`count(*)::int`,
        cost: sql<number>`sum(${llmUsage.costUsd})::numeric`,
        avgLatency: sql<number>`avg(${llmUsage.latencyMs})::int`,
      })
      .from(llmUsage)
      .where(
        dateFilter
          ? and(eq(llmUsage.agentId, id), gte(llmUsage.createdAt, dateFilter))
          : eq(llmUsage.agentId, id)
      )
      .groupBy(llmUsage.taskType)
      .orderBy(desc(sql`count(*)`));

    const byTask = await byTaskQuery;

    // Get recent usage (last 20 calls)
    const recentQuery = db
      .select({
        id: llmUsage.id,
        model: llmUsage.model,
        provider: llmUsage.provider,
        taskType: llmUsage.taskType,
        inputTokens: llmUsage.inputTokens,
        outputTokens: llmUsage.outputTokens,
        cost: llmUsage.costUsd,
        latency: llmUsage.latencyMs,
        success: llmUsage.success,
        createdAt: llmUsage.createdAt,
      })
      .from(llmUsage)
      .where(eq(llmUsage.agentId, id))
      .orderBy(desc(llmUsage.createdAt))
      .limit(20);

    const recent = await recentQuery;

    return NextResponse.json({
      period,
      stats: {
        totalCalls: stats.totalCalls || 0,
        totalInputTokens: stats.totalInputTokens || 0,
        totalOutputTokens: stats.totalOutputTokens || 0,
        totalCost: parseFloat(String(stats.totalCost || 0)),
        avgLatency: stats.avgLatency || 0,
        successRate: parseFloat(String(stats.successRate || 100)),
      },
      byModel: byModel.map(m => ({
        model: m.model,
        provider: m.provider,
        calls: m.calls,
        cost: parseFloat(String(m.cost || 0)),
        avgLatency: m.avgLatency || 0,
      })),
      byTask: byTask.map(t => ({
        taskType: t.taskType,
        calls: t.calls,
        cost: parseFloat(String(t.cost || 0)),
        avgLatency: t.avgLatency || 0,
      })),
      recent: recent.map(r => ({
        id: r.id,
        model: r.model,
        provider: r.provider,
        taskType: r.taskType,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cost: parseFloat(String(r.cost || 0)),
        latency: r.latency,
        success: r.success,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get LLM usage error:', error);
    return NextResponse.json(
      { error: 'Failed to get LLM usage' },
      { status: 500 }
    );
  }
}
