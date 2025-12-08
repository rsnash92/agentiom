// LLM Provider Types and Configuration

export type LLMProvider = 'anthropic' | 'openai' | 'deepseek' | 'google' | 'xai';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  inputPricePerMillion: number;  // USD per million tokens
  outputPricePerMillion: number; // USD per million tokens
  supportsVision?: boolean;
  supportsTools?: boolean;
  maxOutputTokens?: number;
}

// Model catalog with pricing
export const AVAILABLE_MODELS: LLMModel[] = [
  // Anthropic Claude
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 32000,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 64000,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 4,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 8192,
  },
  // OpenAI
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'o1',
    name: 'OpenAI o1',
    provider: 'openai',
    contextWindow: 200000,
    inputPricePerMillion: 15,
    outputPricePerMillion: 60,
    supportsVision: true,
    supportsTools: false,
    maxOutputTokens: 100000,
  },
  {
    id: 'o1-mini',
    name: 'OpenAI o1-mini',
    provider: 'openai',
    contextWindow: 128000,
    inputPricePerMillion: 3,
    outputPricePerMillion: 12,
    supportsVision: false,
    supportsTools: false,
    maxOutputTokens: 65536,
  },
  // DeepSeek
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    contextWindow: 64000,
    inputPricePerMillion: 0.27,
    outputPricePerMillion: 1.10,
    supportsVision: false,
    supportsTools: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    contextWindow: 64000,
    inputPricePerMillion: 0.55,
    outputPricePerMillion: 2.19,
    supportsVision: false,
    supportsTools: false,
    maxOutputTokens: 8192,
  },
  // Google
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    inputPricePerMillion: 0.10,
    outputPricePerMillion: 0.40,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 8192,
  },
  // xAI Grok
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    contextWindow: 131072,
    inputPricePerMillion: 2,
    outputPricePerMillion: 10,
    supportsVision: true,
    supportsTools: true,
    maxOutputTokens: 8192,
  },
];

export interface LLMParameters {
  temperature?: number;      // 0-2, default 0.7
  topP?: number;            // 0-1, default 1
  frequencyPenalty?: number; // -2 to 2, default 0
  presencePenalty?: number;  // -2 to 2, default 0
  maxTokens?: number;        // Max output tokens
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  parameters?: LLMParameters;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: number; // USD
  latencyMs: number;
}

export interface AgentLLMConfig {
  primaryModel: string;      // Main model for complex decisions
  simpleModel: string;       // Fast model for simple tasks
  analysisModel: string;     // Model for market analysis
  autoSelect: boolean;       // Let system choose best model per task
  parameters: LLMParameters;
}

export const DEFAULT_LLM_CONFIG: AgentLLMConfig = {
  primaryModel: 'claude-sonnet-4-20250514',
  simpleModel: 'gpt-4o-mini',
  analysisModel: 'deepseek-chat',
  autoSelect: true,
  parameters: {
    temperature: 0.3,  // Lower for trading decisions
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    maxTokens: 4096,
  },
};

export function getModelById(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

export function getModelsByProvider(provider: LLMProvider): LLMModel[] {
  return AVAILABLE_MODELS.filter(m => m.provider === provider);
}

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMillion;

  return inputCost + outputCost;
}
