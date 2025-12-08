'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAgents, Agent } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function AgentsPageContent() {
  const { agents, isLoading, error, toggleAgentStatus } = useAgents();

  const handleToggleStatus = async (e: React.MouseEvent, agentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleAgentStatus(agentId);
  };

  const getLLMDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      claude: 'Claude',
      openai: 'GPT-4',
      deepseek: 'DeepSeek',
    };
    return names[provider] || provider;
  };

  const formatPairs = (pairs: string[]) => {
    if (!pairs || pairs.length === 0) return ['BTC'];
    return pairs.map(p => p.replace('-PERP', '').replace('/', ''));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Agents</h1>
            <p className="text-foreground-muted text-sm mt-1">Manage your AI trading agents</p>
          </div>
          <Button asChild>
            <Link href="/agents/new">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && agents.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border border-border h-[280px]">
                <CardContent className="p-5 animate-pulse">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg bg-background-secondary" />
                    <div className="h-5 w-16 rounded bg-background-secondary" />
                  </div>
                  <div className="h-5 w-3/4 bg-background-secondary rounded mb-2" />
                  <div className="h-4 w-full bg-background-secondary rounded mb-4" />
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="h-10 bg-background-secondary rounded" />
                    <div className="h-10 bg-background-secondary rounded" />
                    <div className="h-10 bg-background-secondary rounded" />
                    <div className="h-10 bg-background-secondary rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Agents Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent: Agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`}>
                <Card className="bg-card border border-border hover:border-border-hover transition-colors cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BotIcon className="h-5 w-5 text-primary" />
                      </div>
                      <button
                        onClick={(e) => handleToggleStatus(e, agent.id)}
                        className="focus:outline-none"
                      >
                        <Badge
                          variant={
                            agent.status === 'active' ? 'success' :
                            agent.status === 'paused' ? 'warning' : 'default'
                          }
                          size="sm"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {agent.status}
                        </Badge>
                      </button>
                    </div>

                    <h3 className="text-[15px] font-semibold mb-1">{agent.name}</h3>
                    <p className="text-xs text-foreground-muted mb-4 line-clamp-2">{agent.strategy}</p>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-foreground-muted">Max Leverage</p>
                        <p className="text-sm font-medium font-mono">{agent.policies.maxLeverage}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">Max Position</p>
                        <p className="text-sm font-medium font-mono">${agent.policies.maxPositionSizeUsd.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">Max Drawdown</p>
                        <p className="text-sm font-medium font-mono">{agent.policies.maxDrawdownPct}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-foreground-muted">Interval</p>
                        <p className="text-sm font-medium font-mono">{agent.executionIntervalSeconds}s</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-foreground-muted">
                        <span className="flex items-center gap-1">
                          <ModelIcon className="h-3 w-3" />
                          {getLLMDisplayName(agent.llmProvider)}
                        </span>
                        <span>•</span>
                        <span>
                          {formatPairs(agent.policies.approvedPairs).join(', ')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Create New Agent Card */}
            <Link href="/agents/new">
              <Card className="bg-card border border-border border-dashed hover:border-border-hover transition-colors cursor-pointer h-full">
                <CardContent className="p-5 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
                  <div className="h-10 w-10 rounded-lg bg-background-secondary flex items-center justify-center mb-4">
                    <PlusIcon className="h-5 w-5 text-foreground-muted" />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1">Create New Agent</h3>
                  <p className="text-xs text-foreground-muted">
                    Deploy a new AI trading agent with custom strategy
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && agents.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BotIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-foreground-muted text-sm mb-6">
              Create your first AI trading agent to get started
            </p>
            <Button asChild>
              <Link href="/agents/new">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Agent
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <ProtectedRoute>
      <AgentsPageContent />
    </ProtectedRoute>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ModelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
