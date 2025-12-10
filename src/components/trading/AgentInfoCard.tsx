'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface OtherAgent {
  id: string;
  name: string;
  status: string;
  isDemo?: boolean;
  balance?: number;
}

interface AgentInfoCardProps {
  agentId: string;
  agentName: string;
  balance: number;
  status: 'active' | 'paused';
  isDemo: boolean;
  onToggleStatus?: () => void;
  otherAgents?: OtherAgent[];
  onSelectAgent?: (agentId: string) => void;
}

export function AgentInfoCard({
  agentId,
  agentName,
  balance: initialBalance,
  status,
  isDemo,
  onToggleStatus,
  otherAgents = [],
  onSelectAgent,
}: AgentInfoCardProps) {
  const { getAccessToken } = usePrivy();
  const [currentBalance, setCurrentBalance] = useState(initialBalance);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);

  // Reset balance when initialBalance prop changes (e.g. agent switch)
  useEffect(() => {
    setCurrentBalance(initialBalance);
  }, [initialBalance]);

  // Fetch real-time balance from performance API
  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/agents/${agentId}/performance`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          if (data.currentBalance !== undefined) {
            setCurrentBalance(data.currentBalance);
          }
          if (data.unrealizedPnl !== undefined) {
            setUnrealizedPnl(data.unrealizedPnl);
          }
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    // Fetch immediately
    fetchBalance();

    // Then every 5 seconds
    const interval = setInterval(fetchBalance, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [agentId, getAccessToken]);

  // Combine current agent with other agents for tabs
  const allAgents = [
    { id: agentId, name: agentName, status, isDemo, balance: currentBalance },
    ...otherAgents.filter(a => a.id !== agentId)
  ];

  return (
    <div className="panel px-2 sm:px-4 py-2 flex items-center gap-2">
      {/* Agent Tabs - side by side, each with full info */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-1">
        {allAgents.map((agent) => {
          const isSelected = agent.id === agentId;
          const agentBalance = isSelected ? currentBalance : (agent.balance || 0);
          const agentPnl = isSelected ? unrealizedPnl : 0;

          return (
            <div
              key={agent.id}
              onClick={() => !isSelected && onSelectAgent?.(agent.id)}
              className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                isSelected
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-background-secondary/50 hover:bg-background-secondary cursor-pointer'
              }`}
            >
              {/* Agent name with status dot */}
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  agent.status === 'active' ? 'bg-success animate-pulse' : 'bg-foreground-subtle'
                }`} />
                <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {agent.name}
                </span>
              </div>

              {/* Balance and PnL */}
              <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  ${agentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {isSelected && agentPnl !== 0 && (
                  <span className={`text-[10px] sm:text-xs font-medium ${agentPnl >= 0 ? 'text-success' : 'text-error'}`}>
                    {agentPnl >= 0 ? '+' : ''}{agentPnl.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-1">
                {/* Running/Paused toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected) onToggleStatus?.();
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
                    agent.status === 'active'
                      ? 'bg-success/20 text-success hover:bg-error/20 hover:text-error'
                      : 'bg-foreground-subtle/20 text-foreground-muted hover:bg-success/20 hover:text-success'
                  }`}
                  title={agent.status === 'active' ? 'Click to pause' : 'Click to start'}
                >
                  {agent.status === 'active' ? (
                    <>
                      <PauseIcon className="w-2.5 h-2.5" />
                      RUNNING
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-2.5 h-2.5" />
                      PAUSED
                    </>
                  )}
                </button>

                {/* Demo/Live badge */}
                <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${
                  agent.isDemo
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-primary/20 text-primary'
                }`}>
                  {agent.isDemo ? 'DEMO' : 'LIVE'}
                </span>

                {/* Details link */}
                <Link
                  href={`/agents/${agent.id}/details`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] sm:text-[10px] text-foreground-muted hover:text-foreground font-medium"
                >
                  DETAILS
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Agent link - far right */}
      <Link
        href="/agents/new"
        className="flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:text-primary/80 font-medium flex-shrink-0"
      >
        <PlusIcon className="w-3 h-3" />
        NEW
      </Link>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
