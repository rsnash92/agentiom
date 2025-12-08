'use client';

import { useState } from 'react';
import { Settings, ChevronDown, Check, Zap, Brain, TrendingUp, DollarSign } from 'lucide-react';
import {
  AVAILABLE_MODELS,
  LLMModel,
  LLMProvider,
  AgentLLMConfig,
  DEFAULT_LLM_CONFIG,
  getModelsByProvider,
} from '@/lib/llm/types';

interface ModelSelectorProps {
  config: AgentLLMConfig;
  onConfigChange: (config: AgentLLMConfig) => void;
  disabled?: boolean;
}

const PROVIDER_INFO: Record<LLMProvider, { name: string; color: string }> = {
  anthropic: { name: 'Anthropic', color: 'bg-orange-500' },
  openai: { name: 'OpenAI', color: 'bg-green-500' },
  deepseek: { name: 'DeepSeek', color: 'bg-blue-500' },
  google: { name: 'Google', color: 'bg-red-500' },
  xai: { name: 'xAI', color: 'bg-gray-500' },
};

const TASK_TYPES = [
  {
    key: 'primaryModel' as const,
    label: 'Primary Model',
    description: 'Complex trading decisions',
    icon: Brain,
  },
  {
    key: 'simpleModel' as const,
    label: 'Simple Model',
    description: 'Quick, routine tasks',
    icon: Zap,
  },
  {
    key: 'analysisModel' as const,
    label: 'Analysis Model',
    description: 'Market data analysis',
    icon: TrendingUp,
  },
];

function ModelDropdown({
  selectedModelId,
  onSelect,
  label,
  disabled,
}: {
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId);

  const groupedModels = AVAILABLE_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<LLMProvider, LLMModel[]>);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-lg border
          ${disabled
            ? 'bg-zinc-800/50 border-zinc-700 cursor-not-allowed opacity-50'
            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-2">
          {selectedModel && (
            <span className={`w-2 h-2 rounded-full ${PROVIDER_INFO[selectedModel.provider].color}`} />
          )}
          <span className="text-white text-sm">
            {selectedModel?.name || 'Select model'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
            {(Object.keys(groupedModels) as LLMProvider[]).map(provider => (
              <div key={provider}>
                <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 bg-zinc-800/50 sticky top-0">
                  {PROVIDER_INFO[provider].name}
                </div>
                {groupedModels[provider].map(model => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelect(model.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800
                      ${model.id === selectedModelId ? 'bg-zinc-800' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${PROVIDER_INFO[provider].color}`} />
                      <span className="text-white text-sm">{model.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">
                        ${((model.inputPricePerMillion + model.outputPricePerMillion) / 2).toFixed(2)}/M
                      </span>
                      {model.id === selectedModelId && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ParameterSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  description,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-400">{label}</label>
        <span className="text-sm text-white font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={`
          w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-zinc-700
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}

export function ModelSelector({ config, onConfigChange, disabled }: ModelSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (updates: Partial<AgentLLMConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const updateParameters = (updates: Partial<AgentLLMConfig['parameters']>) => {
    onConfigChange({
      ...config,
      parameters: { ...config.parameters, ...updates },
    });
  };

  // Calculate estimated costs
  const primaryModel = AVAILABLE_MODELS.find(m => m.id === config.primaryModel);
  const simpleModel = AVAILABLE_MODELS.find(m => m.id === config.simpleModel);
  const analysisModel = AVAILABLE_MODELS.find(m => m.id === config.analysisModel);

  const estimatedCostPer1000Calls = primaryModel && simpleModel && analysisModel
    ? (
        (primaryModel.inputPricePerMillion * 2000 + primaryModel.outputPricePerMillion * 500) / 1000 * 0.3 +
        (simpleModel.inputPricePerMillion * 500 + simpleModel.outputPricePerMillion * 200) / 1000 * 0.5 +
        (analysisModel.inputPricePerMillion * 1500 + analysisModel.outputPricePerMillion * 500) / 1000 * 0.2
      ).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Auto-Select Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-medium">Auto-Select Models</span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Automatically choose the best model for each task type
          </p>
        </div>
        <button
          type="button"
          onClick={() => updateConfig({ autoSelect: !config.autoSelect })}
          disabled={disabled}
          className={`
            relative w-12 h-6 rounded-full transition-colors
            ${config.autoSelect ? 'bg-green-500' : 'bg-zinc-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${config.autoSelect ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>

      {/* Model Selection Grid */}
      <div className="grid gap-4">
        {TASK_TYPES.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-zinc-800">
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <h4 className="text-white font-medium">{label}</h4>
                <p className="text-sm text-zinc-500">{description}</p>
              </div>
            </div>
            <ModelDropdown
              selectedModelId={config[key]}
              onSelect={(modelId) => updateConfig({ [key]: modelId })}
              label={label}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {/* Cost Estimate */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
        <DollarSign className="w-5 h-5 text-green-500" />
        <div>
          <span className="text-sm text-zinc-400">Estimated cost per 1,000 executions: </span>
          <span className="text-white font-medium">${estimatedCostPer1000Calls}</span>
        </div>
      </div>

      {/* Advanced Parameters */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="text-white font-medium">Advanced Parameters</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-zinc-800 space-y-6">
            <ParameterSlider
              label="Temperature"
              value={config.parameters.temperature ?? 0.3}
              onChange={v => updateParameters({ temperature: v })}
              min={0}
              max={2}
              step={0.1}
              description="Controls randomness. Lower = more focused, higher = more creative"
              disabled={disabled}
            />

            <ParameterSlider
              label="Top P"
              value={config.parameters.topP ?? 0.9}
              onChange={v => updateParameters({ topP: v })}
              min={0}
              max={1}
              step={0.05}
              description="Nucleus sampling. Lower values for more deterministic outputs"
              disabled={disabled}
            />

            <ParameterSlider
              label="Frequency Penalty"
              value={config.parameters.frequencyPenalty ?? 0}
              onChange={v => updateParameters({ frequencyPenalty: v })}
              min={-2}
              max={2}
              step={0.1}
              description="Reduces repetition of frequent tokens"
              disabled={disabled}
            />

            <ParameterSlider
              label="Presence Penalty"
              value={config.parameters.presencePenalty ?? 0}
              onChange={v => updateParameters({ presencePenalty: v })}
              min={-2}
              max={2}
              step={0.1}
              description="Encourages new topics"
              disabled={disabled}
            />

            <ParameterSlider
              label="Max Tokens"
              value={config.parameters.maxTokens ?? 4096}
              onChange={v => updateParameters({ maxTokens: v })}
              min={256}
              max={16384}
              step={256}
              description="Maximum tokens in response"
              disabled={disabled}
            />

            {/* Reset to Defaults */}
            <button
              type="button"
              onClick={() => onConfigChange(DEFAULT_LLM_CONFIG)}
              disabled={disabled}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      {/* Available Models Info */}
      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800">
        <h4 className="text-white font-medium mb-3">{AVAILABLE_MODELS.length} Models Available</h4>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PROVIDER_INFO) as LLMProvider[]).map(provider => {
            const models = getModelsByProvider(provider);
            return (
              <div
                key={provider}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800 text-xs"
              >
                <span className={`w-2 h-2 rounded-full ${PROVIDER_INFO[provider].color}`} />
                <span className="text-zinc-300">{PROVIDER_INFO[provider].name}</span>
                <span className="text-zinc-500">({models.length})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
