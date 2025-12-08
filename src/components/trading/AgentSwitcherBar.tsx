'use client';

interface Agent {
  id: string;
  name: string;
  address: string;
  totalBalance: number;
  unrealizedPnl: number;
  status: 'active' | 'paused' | 'stopped';
}

interface AgentSwitcherBarProps {
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

export function AgentSwitcherBar({
  agents,
  selectedAgentId,
  onSelectAgent,
}: AgentSwitcherBarProps) {
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="panel flex items-center gap-1 p-1">
      {/* Agent tabs */}
      <div className="flex items-center gap-1">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
                isSelected
                  ? 'bg-background-secondary text-foreground'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background/50'
              }`}
            >
              {/* Mini avatar */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                isSelected
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  : 'bg-background-tertiary text-foreground-muted'
              }`}>
                {getInitials(agent.name)}
              </div>

              {/* Name */}
              <span className="text-xs font-medium truncate max-w-[100px]">
                {agent.name}
              </span>

              {/* Status dot */}
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                agent.status === 'active' ? 'bg-success' :
                agent.status === 'paused' ? 'bg-warning' : 'bg-error'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Selected agent balance */}
      {selectedAgent && (
        <div className="flex items-center gap-3 px-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">Balance:</span>
            <span className="text-sm font-semibold font-mono">
              ${selectedAgent.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-mono ${
            selectedAgent.unrealizedPnl >= 0 ? 'text-success' : 'text-error'
          }`}>
            {selectedAgent.unrealizedPnl >= 0 ? (
              <ArrowUpIcon className="w-3 h-3" />
            ) : (
              <ArrowDownIcon className="w-3 h-3" />
            )}
            <span>${Math.abs(selectedAgent.unrealizedPnl).toFixed(2)} PnL</span>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add agent button */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors rounded hover:bg-background/50">
        <PlusIcon className="w-4 h-4" />
        <span>New Agent</span>
      </button>
    </div>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12l7 7 7-7" />
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
