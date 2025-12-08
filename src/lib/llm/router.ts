// LLM Router Service - Unified interface for multiple LLM providers

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMParameters,
  LLMMessage,
  getModelById,
  calculateCost,
} from './types';

// Provider clients (lazy initialized)
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let deepseekClient: OpenAI | null = null;
let googleClient: any | null = null;
let xaiClient: OpenAI | null = null;

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

function getDeepSeekClient(): OpenAI {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }
  return deepseekClient;
}

function getXAIClient(): OpenAI {
  if (!xaiClient) {
    xaiClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return xaiClient;
}

// Determine provider from model ID
function getProviderForModel(modelId: string): LLMProvider {
  const model = getModelById(modelId);
  if (model) return model.provider;

  // Fallback detection by prefix
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gpt') || modelId.startsWith('o1')) return 'openai';
  if (modelId.startsWith('deepseek')) return 'deepseek';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('grok')) return 'xai';

  throw new Error(`Unknown model: ${modelId}`);
}

// Convert messages to Anthropic format
function toAnthropicMessages(messages: LLMMessage[]): {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
} {
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  return {
    system: systemMessage?.content,
    messages: otherMessages,
  };
}

// Convert messages to OpenAI format
function toOpenAIMessages(
  messages: LLMMessage[]
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
}

// Call Anthropic Claude
async function callAnthropic(
  request: LLMRequest
): Promise<LLMResponse> {
  const client = getAnthropicClient();
  const { system, messages } = toAnthropicMessages(request.messages);
  const params = request.parameters || {};

  const startTime = Date.now();

  const response = await client.messages.create({
    model: request.model,
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature,
    top_p: params.topP,
    system: system,
    messages: messages,
  });

  const latencyMs = Date.now() - startTime;
  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    content,
    model: request.model,
    provider: 'anthropic',
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    cost: calculateCost(request.model, inputTokens, outputTokens),
    latencyMs,
  };
}

// Call OpenAI-compatible APIs (OpenAI, DeepSeek, xAI)
async function callOpenAICompatible(
  request: LLMRequest,
  provider: LLMProvider
): Promise<LLMResponse> {
  let client: OpenAI;

  switch (provider) {
    case 'openai':
      client = getOpenAIClient();
      break;
    case 'deepseek':
      client = getDeepSeekClient();
      break;
    case 'xai':
      client = getXAIClient();
      break;
    default:
      throw new Error(`Unsupported OpenAI-compatible provider: ${provider}`);
  }

  const messages = toOpenAIMessages(request.messages);
  const params = request.parameters || {};

  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: request.model,
    messages: messages,
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature,
    top_p: params.topP,
    frequency_penalty: params.frequencyPenalty,
    presence_penalty: params.presencePenalty,
  });

  const latencyMs = Date.now() - startTime;
  const content = response.choices[0]?.message?.content || '';
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;

  return {
    content,
    model: request.model,
    provider,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    cost: calculateCost(request.model, inputTokens, outputTokens),
    latencyMs,
  };
}

// Call Google Gemini
async function callGoogle(request: LLMRequest): Promise<LLMResponse> {
  // Using REST API directly for Google
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  const params = request.parameters || {};
  const startTime = Date.now();

  // Convert messages to Gemini format
  const systemInstruction = request.messages.find(m => m.role === 'system')?.content;
  const contents = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          maxOutputTokens: params.maxTokens || 4096,
          temperature: params.temperature,
          topP: params.topP,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error: ${error}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  return {
    content,
    model: request.model,
    provider: 'google',
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    cost: calculateCost(request.model, inputTokens, outputTokens),
    latencyMs,
  };
}

// Main routing function
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const provider = getProviderForModel(request.model);

  switch (provider) {
    case 'anthropic':
      return callAnthropic(request);
    case 'openai':
    case 'deepseek':
    case 'xai':
      return callOpenAICompatible(request, provider);
    case 'google':
      return callGoogle(request);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Auto-select best model for task type
export type TaskType = 'complex' | 'simple' | 'analysis' | 'reasoning';

export function selectModelForTask(
  taskType: TaskType,
  config: {
    primaryModel: string;
    simpleModel: string;
    analysisModel: string;
  }
): string {
  switch (taskType) {
    case 'complex':
      return config.primaryModel;
    case 'simple':
      return config.simpleModel;
    case 'analysis':
      return config.analysisModel;
    case 'reasoning':
      // Use reasoning models if available
      return config.primaryModel;
    default:
      return config.primaryModel;
  }
}

// Convenience function for simple completions
export async function complete(
  prompt: string,
  modelId: string,
  parameters?: LLMParameters
): Promise<LLMResponse> {
  return callLLM({
    model: modelId,
    messages: [{ role: 'user', content: prompt }],
    parameters,
  });
}

// Convenience function with system prompt
export async function chat(
  systemPrompt: string,
  userMessage: string,
  modelId: string,
  parameters?: LLMParameters
): Promise<LLMResponse> {
  return callLLM({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    parameters,
  });
}
