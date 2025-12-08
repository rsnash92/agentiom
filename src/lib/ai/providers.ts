import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { LLMProvider, Decision } from '@/types';
import { AGENT_SYSTEM_PROMPT } from './prompts';

// Initialize clients lazily
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface LLMCallParams {
  system: string;
  user: string;
  responseFormat?: 'json' | 'text';
}

/**
 * Call an LLM provider with the given parameters
 */
export async function callLLM(
  provider: LLMProvider,
  params: LLMCallParams
): Promise<string> {
  switch (provider) {
    case 'claude':
      return callClaude(params);
    case 'gpt4':
      return callGPT4(params);
    case 'gemini':
      return callGemini(params);
    case 'deepseek':
      return callDeepSeek(params);
    case 'grok':
      return callGrok(params);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

async function callClaude(params: LLMCallParams): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: params.system,
    messages: [
      {
        role: 'user',
        content: params.user,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}

async function callGPT4(params: LLMCallParams): Promise<string> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    max_tokens: 2048,
    response_format: params.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    messages: [
      {
        role: 'system',
        content: params.system,
      },
      {
        role: 'user',
        content: params.user,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT-4');
  }

  return content;
}

async function callGemini(params: LLMCallParams): Promise<string> {
  // Using Google's generative AI API
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.system }],
        },
        contents: [
          {
            parts: [{ text: params.user }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          responseMimeType: params.responseFormat === 'json' ? 'application/json' : 'text/plain',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

async function callDeepSeek(params: LLMCallParams): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: params.system,
        },
        {
          role: 'user',
          content: params.user,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callGrok(params: LLMCallParams): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: params.system,
        },
        {
          role: 'user',
          content: params.user,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Parse and validate the AI decision response
 */
export function parseDecisionResponse(response: string): Decision {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required fields
  const validActions = ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'ADD', 'REDUCE', 'NO_ACTION'];
  if (!validActions.includes(parsed.action)) {
    throw new Error(`Invalid action: ${parsed.action}`);
  }

  if (typeof parsed.symbol !== 'string' || !parsed.symbol) {
    throw new Error('Invalid or missing symbol');
  }

  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
    throw new Error('Confidence must be a number between 0 and 100');
  }

  if (typeof parsed.sizeUsd !== 'number' || parsed.sizeUsd < 0) {
    throw new Error('sizeUsd must be a non-negative number');
  }

  if (typeof parsed.leverage !== 'number' || parsed.leverage < 1 || parsed.leverage > 50) {
    throw new Error('Leverage must be between 1 and 50');
  }

  return {
    action: parsed.action,
    symbol: parsed.symbol,
    confidence: parsed.confidence,
    sizeUsd: parsed.sizeUsd,
    leverage: parsed.leverage,
    takeProfit: parsed.takeProfit ?? undefined,
    stopLoss: parsed.stopLoss ?? undefined,
    reasoning: parsed.reasoning || 'No reasoning provided',
    marketContext: parsed.marketContext || 'No market context provided',
  };
}
