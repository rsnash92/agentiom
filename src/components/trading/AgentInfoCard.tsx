'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface AgentInfoCardProps {
  agentId: string;
  agentName: string;
  balance: number;
  status: 'active' | 'paused';
  isDemo: boolean;
  onToggleStatus?: () => void;
}

export function AgentInfoCard({
  agentId,
  agentName,
  balance: initialBalance,
  status,
  isDemo,
  onToggleStatus,
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

  return (
    <div className="panel px-4 py-2 flex items-center gap-4">
      {/* Agent avatar/icon */}
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <AgentIcon className="w-4 h-4 text-primary" />
      </div>

      {/* Agent name and balance */}
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground truncate">{agentName}</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {unrealizedPnl !== 0 && (
            <span className={`text-xs font-medium ${unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
              {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Running/Paused status */}
        <button
          onClick={onToggleStatus}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            status === 'active'
              ? 'bg-success/20 text-success hover:bg-success/30'
              : 'bg-foreground-subtle/20 text-foreground-muted hover:bg-foreground-subtle/30'
          }`}
        >
          {status === 'active' ? 'RUNNING' : 'PAUSED'}
        </button>

        {/* Demo/Live badge */}
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          isDemo
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-primary/20 text-primary'
        }`}>
          {isDemo ? 'DEMO TRADING' : 'LIVE TRADING'}
        </span>

        {/* Details link */}
        <Link
          href={`/agents/${agentId}/details`}
          className="text-[10px] text-foreground-muted hover:text-foreground font-medium ml-1"
        >
          DETAILS
        </Link>

        {/* Spacer to push New Agent to far right */}
        <div className="flex-1" />

        {/* New Agent link */}
        <Link
          href="/agents/new"
          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium"
        >
          <PlusIcon className="w-3 h-3" />
          NEW AGENT
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
