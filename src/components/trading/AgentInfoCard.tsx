'use client';

import Link from 'next/link';

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
  balance,
  status,
  isDemo,
  onToggleStatus,
}: AgentInfoCardProps) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between">
        {/* Left side - Agent info */}
        <div className="flex items-center gap-3">
          {/* Agent avatar/icon */}
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <AgentIcon className="w-5 h-5 text-primary" />
          </div>

          <div>
            {/* Agent name */}
            <h2 className="font-semibold text-foreground">{agentName}</h2>

            {/* Balance */}
            <div className="text-xl font-bold text-foreground mt-0.5">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Right side - Status and actions */}
        <div className="flex flex-col items-end gap-2">
          {/* Status badge row */}
          <div className="flex items-center gap-2">
            {/* Running/Paused status */}
            <button
              onClick={onToggleStatus}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                status === 'active'
                  ? 'bg-success/20 text-success hover:bg-success/30'
                  : 'bg-foreground-subtle/20 text-foreground-muted hover:bg-foreground-subtle/30'
              }`}
            >
              {status === 'active' ? 'RUNNING' : 'PAUSED'}
            </button>

            {/* Demo/Live badge */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isDemo
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-primary/20 text-primary'
            }`}>
              {isDemo ? 'DEMO TRADING' : 'LIVE TRADING'}
            </span>
          </div>

          {/* Details link */}
          <Link
            href={`/agents/${agentId}/settings`}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            DETAILS
          </Link>
        </div>
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
