'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="panel px-3 sm:px-4 py-2 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
      {/* Agent avatar/icon */}
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <AgentIcon className="w-4 h-4 text-primary" />
      </div>

      {/* Agent name and balance with dropdown */}
      <div className="min-w-0 relative flex-1 sm:flex-none" ref={dropdownRef}>
        <button
          onClick={() => otherAgents.length > 0 && setShowAgentDropdown(!showAgentDropdown)}
          className={`flex items-center gap-1 text-sm font-medium text-foreground truncate ${otherAgents.length > 0 ? 'hover:text-primary cursor-pointer' : ''}`}
        >
          {agentName}
          {otherAgents.length > 0 && (
            <ChevronDownIcon className={`w-3 h-3 transition-transform ${showAgentDropdown ? 'rotate-180' : ''}`} />
          )}
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-sm sm:text-base font-bold text-foreground">
            ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {unrealizedPnl !== 0 && (
            <span className={`text-xs font-medium ${unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
              {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Agent Dropdown */}
        {showAgentDropdown && otherAgents.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-background-secondary border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
            {otherAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  onSelectAgent?.(agent.id);
                  setShowAgentDropdown(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-background-tertiary transition-colors flex items-center gap-2 ${
                  agent.id === agentId ? 'text-primary font-medium' : 'text-foreground'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  agent.status === 'active' ? 'bg-success' : 'bg-foreground-subtle'
                }`} />
                <span className="truncate">{agent.name}</span>
                {agent.id === agentId && (
                  <CheckIcon className="w-3 h-3 ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
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

        {/* Details link - hide on very small screens */}
        <Link
          href={`/agents/${agentId}/details`}
          className="hidden xs:inline text-[9px] sm:text-[10px] text-foreground-muted hover:text-foreground font-medium"
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
