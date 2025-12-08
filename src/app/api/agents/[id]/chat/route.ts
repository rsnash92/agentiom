import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { agents, chatMessages, users, positions, llmUsage } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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

    // Get database user
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

// System prompt for trading assistant
function buildSystemPrompt(agent: {
  name: string;
  personality: string;
  strategy: string;
  policies: {
    maxLeverage: number;
    maxPositionSizeUsd: number;
    maxPositionSizePct: number;
    maxDrawdownPct: number;
    approvedPairs: string[];
  };
}, context: {
  positions: Array<{ symbol: string; side: string; size: string; entryPrice: string; unrealizedPnl: string }>;
  balance?: number;
}): string {
  return `You are ${agent.name}, an AI trading assistant with the following characteristics:

PERSONALITY: ${agent.personality}

STRATEGY: ${agent.strategy}

TRADING POLICIES:
- Max Leverage: ${agent.policies.maxLeverage}x
- Max Position Size: $${agent.policies.maxPositionSizeUsd} or ${agent.policies.maxPositionSizePct}% of portfolio
- Max Drawdown: ${agent.policies.maxDrawdownPct}%
- Approved Trading Pairs: ${agent.policies.approvedPairs.join(', ')}

CURRENT PORTFOLIO STATE:
${context.positions.length > 0
  ? context.positions.map(p =>
      `- ${p.symbol}: ${p.side.toUpperCase()} ${p.size} @ $${p.entryPrice} (PnL: $${p.unrealizedPnl || '0'})`
    ).join('\n')
  : '- No open positions'}
${context.balance ? `\nAccount Balance: $${context.balance.toFixed(2)}` : ''}

GUIDELINES:
1. Provide clear, actionable trading insights when asked
2. Always consider risk management and the defined policies
3. Explain your reasoning for any trade suggestions
4. Be concise but thorough in your analysis
5. If you're uncertain, acknowledge it rather than guessing
6. Never recommend trades outside the approved pairs or exceeding position limits
7. Consider current market conditions and the strategy when giving advice

You can help with:
- Market analysis and price action interpretation
- Trade ideas within the defined strategy
- Position sizing and risk calculations
- Explaining trading concepts
- Portfolio review and suggestions
- Setting up alerts and monitoring rules`;
}

// GET - Retrieve chat history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, agentId),
          eq(agents.userId, user.id)
        )
      );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get chat history (last 50 messages)
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.agentId, agentId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    return NextResponse.json({
      messages: messages.reverse().map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
      }))
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

// POST - Send message and get streaming response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[CHAT POST] Starting request...');
  try {
    const { id: agentId } = await params;
    console.log('[CHAT POST] Agent ID:', agentId);

    const body = await request.json();
    console.log('[CHAT POST] Request body:', JSON.stringify(body));
    const { message, stream = true } = body;

    if (!message?.trim()) {
      console.log('[CHAT POST] Error: Message is required');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('[CHAT POST] Getting user from token...');
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('[CHAT POST] Error: Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[CHAT POST] User found:', user.id);

    // Get agent
    console.log('[CHAT POST] Looking up agent...');
    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, agentId),
          eq(agents.userId, user.id)
        )
      );

    if (!agent) {
      console.log('[CHAT POST] Error: Agent not found');
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    console.log('[CHAT POST] Agent found:', agent.name);

    // Get current positions for context
    const openPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.agentId, agentId),
          eq(positions.status, 'open')
        )
      );

    // Get recent chat history for context
    const recentMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.agentId, agentId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(20);

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(
      {
        name: agent.name,
        personality: agent.personality,
        strategy: agent.strategy,
        policies: agent.policies as {
          maxLeverage: number;
          maxPositionSizeUsd: number;
          maxPositionSizePct: number;
          maxDrawdownPct: number;
          approvedPairs: string[];
        },
      },
      {
        positions: openPositions.map(p => ({
          symbol: p.symbol,
          side: p.side,
          size: p.size,
          entryPrice: p.entryPrice,
          unrealizedPnl: p.unrealizedPnl || '0',
        })),
      }
    );

    // Save user message to database
    console.log('[CHAT POST] Saving user message to DB...');
    await db.insert(chatMessages).values({
      agentId,
      userId: user.id,
      role: 'user',
      content: message.trim(),
    });
    console.log('[CHAT POST] User message saved');

    // Build conversation history
    const conversationHistory = recentMessages
      .reverse()
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Add the new user message
    conversationHistory.push({
      role: 'user' as const,
      content: message.trim(),
    });

    // Get the model from agent config
    const llmConfig = agent.llmConfig as {
      primaryModel: string;
      simpleModel: string;
      analysisModel: string;
      autoSelect: boolean;
      parameters: {
        temperature: number;
        topP: number;
        maxTokens: number;
      };
    };

    const modelId = llmConfig.primaryModel || 'claude-sonnet-4-20250514';
    const isAnthropic = modelId.startsWith('claude');
    console.log('[CHAT POST] Using model:', modelId, 'isAnthropic:', isAnthropic);
    console.log('[CHAT POST] Stream mode:', stream);

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();

      const streamResponse = new ReadableStream({
        async start(controller) {
          let fullContent = '';
          let inputTokens = 0;
          let outputTokens = 0;
          const startTime = Date.now();

          try {
            console.log('[CHAT POST] Starting stream generation...');
            if (isAnthropic) {
              // Anthropic streaming
              console.log('[CHAT POST] Creating Anthropic client...');
              const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
              console.log('[CHAT POST] API key present:', !!anthropicApiKey, 'length:', anthropicApiKey?.length);

              if (!anthropicApiKey) {
                throw new Error('ANTHROPIC_API_KEY is not configured');
              }

              const client = new Anthropic({
                apiKey: anthropicApiKey,
              });
              console.log('[CHAT POST] Anthropic client created, starting stream...');

              const stream = client.messages.stream({
                model: modelId,
                max_tokens: llmConfig.parameters.maxTokens || 4096,
                temperature: llmConfig.parameters.temperature || 0.7,
                system: systemPrompt,
                messages: conversationHistory,
              });

              for await (const event of stream) {
                if (event.type === 'content_block_delta') {
                  const delta = event.delta;
                  if ('text' in delta) {
                    fullContent += delta.text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                    );
                  }
                }
                if (event.type === 'message_delta' && event.usage) {
                  outputTokens = event.usage.output_tokens;
                }
                if (event.type === 'message_start' && event.message.usage) {
                  inputTokens = event.message.usage.input_tokens;
                }
              }
            } else {
              // OpenAI-compatible streaming
              let client: OpenAI;

              if (modelId.startsWith('gpt') || modelId.startsWith('o1')) {
                client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              } else if (modelId.startsWith('deepseek')) {
                client = new OpenAI({
                  apiKey: process.env.DEEPSEEK_API_KEY,
                  baseURL: 'https://api.deepseek.com/v1',
                });
              } else if (modelId.startsWith('grok')) {
                client = new OpenAI({
                  apiKey: process.env.XAI_API_KEY,
                  baseURL: 'https://api.x.ai/v1',
                });
              } else {
                // Default to OpenAI
                client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
              }

              const stream = await client.chat.completions.create({
                model: modelId,
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...conversationHistory,
                ],
                max_tokens: llmConfig.parameters.maxTokens || 4096,
                temperature: llmConfig.parameters.temperature || 0.7,
                stream: true,
              });

              for await (const chunk of stream) {
                const text = chunk.choices[0]?.delta?.content;
                if (text) {
                  fullContent += text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                  );
                }
              }

              // Estimate tokens for OpenAI (not returned in streaming)
              inputTokens = Math.ceil((systemPrompt.length + message.length) / 4);
              outputTokens = Math.ceil(fullContent.length / 4);
            }

            const latencyMs = Date.now() - startTime;

            // Save assistant response to database
            await db.insert(chatMessages).values({
              agentId,
              userId: user.id,
              role: 'assistant',
              content: fullContent,
              model: modelId,
              tokens: inputTokens + outputTokens,
            });

            // Track LLM usage
            await db.insert(llmUsage).values({
              agentId,
              userId: user.id,
              model: modelId,
              provider: isAnthropic ? 'anthropic' : 'openai',
              taskType: 'chat',
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              costUsd: '0', // Calculate based on model pricing if needed
              latencyMs,
              success: true,
            });

            // Send completion signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('[CHAT POST] Streaming error:', error);
            console.error('[CHAT POST] Error stack:', error instanceof Error ? error.stack : 'No stack');
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response (fallback)
      let fullContent = '';
      const startTime = Date.now();

      if (isAnthropic) {
        const client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const response = await client.messages.create({
          model: modelId,
          max_tokens: llmConfig.parameters.maxTokens || 4096,
          temperature: llmConfig.parameters.temperature || 0.7,
          system: systemPrompt,
          messages: conversationHistory,
        });

        fullContent = response.content[0].type === 'text' ? response.content[0].text : '';
      } else {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
          ],
          max_tokens: llmConfig.parameters.maxTokens || 4096,
          temperature: llmConfig.parameters.temperature || 0.7,
        });

        fullContent = response.choices[0]?.message?.content || '';
      }

      // Save to database
      await db.insert(chatMessages).values({
        agentId,
        userId: user.id,
        role: 'assistant',
        content: fullContent,
        model: modelId,
      });

      return NextResponse.json({
        message: {
          role: 'assistant',
          content: fullContent,
        },
      });
    }
  } catch (error) {
    console.error('[CHAT POST] Top-level error:', error);
    console.error('[CHAT POST] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

// DELETE - Clear chat history
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify agent ownership
    const [agent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, agentId),
          eq(agents.userId, user.id)
        )
      );

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete all chat messages for this agent
    await db.delete(chatMessages).where(eq(chatMessages.agentId, agentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear chat error:', error);
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 });
  }
}
