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
    <div className="panel px-4 py-2 flex items-center gap-4">
      {/* Agent avatar/icon */}
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <AgentIcon className="w-4 h-4 text-primary" />
      </div>

      {/* Agent name and balance */}
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground truncate">{agentName}</h2>
        <div className="text-base font-bold text-foreground">
          {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          href={`/agents/${agentId}/settings`}
          className="text-[10px] text-primary hover:text-primary/80 font-medium ml-1"
        >
          DETAILS
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
