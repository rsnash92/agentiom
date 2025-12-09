'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface OtherAgent {
  id: string;
  name: string;
  status: string;
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
    { id: agentId, name: agentName, status },
    ...otherAgents.filter(a => a.id !== agentId)
  ];

  return (
    <div className="panel px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-4">
      {/* Agent Tabs - side by side */}
      <div className="flex items-center gap-1 overflow-x-auto flex-shrink-0">
        {allAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => agent.id !== agentId && onSelectAgent?.(agent.id)}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              agent.id === agentId
                ? 'bg-primary/20 text-primary'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-secondary'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              agent.status === 'active' ? 'bg-success' : 'bg-foreground-subtle'
            }`} />
            <span className="truncate max-w-[80px] sm:max-w-none">{agent.name}</span>
          </button>
        ))}
      </div>

      {/* Balance display */}
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-sm sm:text-base font-bold text-foreground">
          ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {unrealizedPnl !== 0 && (
          <span className={`text-xs font-medium ${unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
            {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Status badges - wrap on mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto order-first sm:order-none w-full sm:w-auto justify-end sm:justify-start">
        {/* Running/Paused status */}
        <button
          onClick={onToggleStatus}
          className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-colors ${
            status === 'active'
              ? 'bg-success/20 text-success hover:bg-success/30'
              : 'bg-foreground-subtle/20 text-foreground-muted hover:bg-foreground-subtle/30'
          }`}
        >
          {status === 'active' && (
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-success"></span>
            </span>
          )}
          {status === 'active' ? 'RUNNING' : 'PAUSED'}
        </button>

        {/* Demo/Live badge */}
        <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${
          isDemo
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-primary/20 text-primary'
        }`}>
          {isDemo ? 'DEMO' : 'LIVE'}
        </span>

        {/* Details link */}
        <Link
          href={`/agents/${agentId}/details`}
          className="text-[9px] sm:text-[10px] text-foreground-muted hover:text-foreground font-medium"
        >
          DETAILS
        </Link>

        {/* New Agent link - hide on mobile */}
        <Link
          href="/agents/new"
          className="hidden sm:flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium ml-1"
        >
          <PlusIcon className="w-3 h-3" />
          NEW
        </Link>
      </div>
    </div>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

