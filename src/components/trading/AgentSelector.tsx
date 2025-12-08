'use client';

import { useState, useRef, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  address: string;
  totalBalance: number;
  unrealizedPnl: number;
  status: 'active' | 'paused' | 'stopped';
}

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

export function AgentSelector({
  agents,
  selectedAgentId,
  onSelectAgent,
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format address for display (0x1234...5678)
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 8)}...`;
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-card m-3 rounded-xl border border-border shadow-lg">
      {/* Agent Selector Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background/50 rounded-t-xl transition-colors"
        >
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-lg font-bold text-white">
              {getInitials(selectedAgent?.name || 'A')}
            </span>
          </div>

          {/* Name & Address */}
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold truncate">{selectedAgent?.name}</div>
            <div className="text-xs text-foreground-muted font-mono">
              {formatAddress(selectedAgent?.address || '')}
            </div>
          </div>

          {/* Status indicator + Chevron */}
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              selectedAgent?.status === 'active' ? 'bg-success shadow-[0_0_8px_rgba(45,212,160,0.5)]' :
              selectedAgent?.status === 'paused' ? 'bg-warning' : 'bg-error'
            }`} />
            <ChevronIcon className={`w-5 h-5 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-background border border-border rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  onSelectAgent(agent.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-card transition-colors ${
                  selectedAgentId === agent.id ? 'bg-primary/10' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">
                    {getInitials(agent.name)}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{agent.name}</div>
                  <div className="text-xs text-foreground-muted font-mono">
                    {formatAddress(agent.address)}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  agent.status === 'active' ? 'bg-success' :
                  agent.status === 'paused' ? 'bg-warning' : 'bg-error'
                }`} />
                {selectedAgentId === agent.id && (
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4" />

      {/* Balance Section */}
      <div className="px-4 py-4">
        <div className="text-[11px] uppercase tracking-wider text-foreground-muted mb-2 font-medium">Total Balance</div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold text-primary font-mono tracking-tight">
            ${selectedAgent?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            (selectedAgent?.unrealizedPnl || 0) >= 0
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}>
            {(selectedAgent?.unrealizedPnl || 0) >= 0 ? (
              <ArrowUpIcon className="w-3 h-3" />
            ) : (
              <ArrowDownIcon className="w-3 h-3" />
            )}
            <span className="font-mono">
              ${Math.abs(selectedAgent?.unrealizedPnl || 0).toFixed(2)} PnL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
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
