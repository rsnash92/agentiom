'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  isDemo: boolean;
  demoBalance: string | null;
  inviteCodeUsed: string | null;
  walletAddress: string;
  personality: string;
  strategy: string;
  policies: {
    maxLeverage: number;
    maxPositionSizeUsd: number;
    maxPositionSizePct: number;
    maxDrawdownPct: number;
    approvedPairs: string[];
  };
  llmProvider: string;
  llmConfig?: {
    primaryModel: string;
    simpleModel: string;
    analysisModel: string;
    autoSelect: boolean;
    parameters: {
      temperature: number;
      topP: number;
      frequencyPenalty: number;
      presencePenalty: number;
      maxTokens: number;
    };
  };
  executionIntervalSeconds: number;
  status: string;
  genomeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  prompt?: string; // Combined personality/strategy prompt
  personality?: string; // Legacy support
  strategy?: string; // Legacy support
  isDemo?: boolean;
  inviteCode?: string;
  model?: string;
  approvedPairs?: string[];
  policies?: {
    maxLeverage?: number;
    maxPositionSizeUsd?: number;
    maxPositionSizePct?: number;
    maxDrawdownPct?: number;
    approvedPairs?: string[];
  };
  llmProvider?: 'claude' | 'openai' | 'deepseek';
  executionIntervalSeconds?: number;
}

export interface UpdateAgentInput {
  name?: string;
  personality?: string;
  strategy?: string;
  policies?: {
    maxLeverage: number;
    maxPositionSizeUsd: number;
    maxPositionSizePct: number;
    maxDrawdownPct: number;
    approvedPairs: string[];
  };
  llmProvider?: 'claude' | 'openai' | 'deepseek';
  executionIntervalSeconds?: number;
  status?: 'active' | 'paused';
}

export function useAgents() {
  const { getAccessToken, authenticated } = usePrivy();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!authenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to fetch agents';
        throw new Error(errorMsg);
      }

      setAgents(data.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, getAccessToken]);

  const createAgent = useCallback(async (input: CreateAgentInput): Promise<Agent | null> => {
    if (!authenticated) return null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to create agent';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setAgents(prev => [...prev, data.agent]);
      return data.agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      return null;
    }
  }, [authenticated, getAccessToken]);

  const updateAgent = useCallback(async (id: string, input: UpdateAgentInput): Promise<Agent | null> => {
    if (!authenticated) return null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent');
      }

      const data = await response.json();
      setAgents(prev => prev.map(a => a.id === id ? data.agent : a));
      return data.agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      return null;
    }
  }, [authenticated, getAccessToken]);

  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    if (!authenticated) return false;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agent');
      }

      setAgents(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      return false;
    }
  }, [authenticated, getAccessToken]);

  const toggleAgentStatus = useCallback(async (id: string): Promise<Agent | null> => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return null;

    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    return updateAgent(id, { status: newStatus as 'active' | 'paused' });
  }, [agents, updateAgent]);

  // Fetch agents on mount and when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchAgents();
    }
  }, [authenticated, fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
  };
}

// Hook for fetching a single agent by ID
export function useAgent(agentId: string | null) {
  const { getAccessToken, authenticated } = usePrivy();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!authenticated || !agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Agent not found');
        }
        throw new Error('Failed to fetch agent');
      }

      const data = await response.json();
      setAgent(data.agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent');
      setAgent(null);
    } finally {
      setIsLoading(false);
    }
  }, [authenticated, getAccessToken, agentId]);

  const updateAgent = useCallback(async (input: UpdateAgentInput): Promise<Agent | null> => {
    if (!authenticated || !agentId) return null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent');
      }

      const data = await response.json();
      setAgent(data.agent);
      return data.agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      return null;
    }
  }, [authenticated, getAccessToken, agentId]);

  const toggleStatus = useCallback(async (): Promise<Agent | null> => {
    if (!authenticated || !agent || !agentId) return null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const action = agent.status === 'active' ? 'stop' : 'start';
      const response = await fetch(`/api/agents/${agentId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle agent status');
      }

      const data = await response.json();
      const updatedAgent = { ...agent, status: data.status };
      setAgent(updatedAgent);
      return updatedAgent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
      return null;
    }
  }, [agent, agentId, authenticated, getAccessToken]);

  // Execute one cycle manually
  const executeOnce = useCallback(async () => {
    if (!authenticated || !agentId) return null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute agent');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute');
      return null;
    }
  }, [agentId, authenticated, getAccessToken]);

  // Fetch agent status and logs
  const fetchStatus = useCallback(async () => {
    if (!authenticated || !agentId) return null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/agents/${agentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }, [agentId, authenticated, getAccessToken]);

  useEffect(() => {
    if (authenticated && agentId) {
      fetchAgent();
    }
  }, [authenticated, agentId, fetchAgent]);

  return {
    agent,
    isLoading,
    error,
    fetchAgent,
    updateAgent,
    toggleStatus,
    executeOnce,
    fetchStatus,
  };
}
