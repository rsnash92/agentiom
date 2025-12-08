'use client';

import { useState } from 'react';

interface Adaptation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'disabled';
  confidence: number;
  successRate: number;
  totalRuns: number;
  lastTriggered?: string;
}

interface AgentConfigPanelProps {
  adaptations?: Adaptation[];
  activeCount?: number;
  totalCount?: number;
  avgConfidence?: number;
  avgSuccess?: number;
  onRefresh?: () => void;
}

export function AgentConfigPanel({
  adaptations = [],
  activeCount = 0,
  totalCount = 0,
  avgConfidence = 0,
  avgSuccess = 0,
  onRefresh,
}: AgentConfigPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAdaptations = adaptations.filter(
    (adaptation) =>
      adaptation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adaptation.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
              <GearIcon className="w-5 h-5 text-foreground-muted" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Workflow Adaptations</h3>
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <span>
                  {activeCount} active · {totalCount} total · {avgSuccess}% success
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <TrendIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">{avgConfidence}% avg confidence</span>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search adaptations..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-primary text-black'
                : 'hover:bg-card text-foreground-muted hover:text-foreground'
            }`}
            title="Filter"
          >
            <FilterIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 p-3 bg-card rounded-lg border border-border">
            <div className="text-xs font-medium text-foreground-muted mb-2">Filter by status</div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs bg-primary text-black rounded-md">All</button>
              <button className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-background rounded-md transition-colors">
                Active
              </button>
              <button className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-background rounded-md transition-colors">
                Paused
              </button>
              <button className="px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-background rounded-md transition-colors">
                Disabled
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredAdaptations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
              <GearIcon className="w-8 h-8 text-foreground-subtle" />
            </div>
            <h4 className="text-base font-medium text-foreground-muted mb-1">No Adaptations</h4>
            <p className="text-sm text-foreground-subtle">
              No workflow adaptations have been created yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAdaptations.map((adaptation) => (
              <AdaptationCard key={adaptation.id} adaptation={adaptation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdaptationCardProps {
  adaptation: Adaptation;
}

function AdaptationCard({ adaptation }: AdaptationCardProps) {
  return (
    <div className="p-4 hover:bg-card/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{adaptation.name}</h4>
          <span
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
              adaptation.status === 'active'
                ? 'bg-success/10 text-success'
                : adaptation.status === 'paused'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-error/10 text-error'
            }`}
          >
            {adaptation.status}
          </span>
        </div>
        <span className="text-xs text-foreground-subtle">{adaptation.confidence}% confidence</span>
      </div>
      <p className="text-xs text-foreground-muted mb-3">{adaptation.description}</p>
      <div className="flex items-center gap-4 text-[11px]">
        <div>
          <span className="text-foreground-subtle">Success Rate</span>
          <span
            className={`ml-1.5 font-mono ${adaptation.successRate >= 50 ? 'text-success' : 'text-error'}`}
          >
            {adaptation.successRate}%
          </span>
        </div>
        <div>
          <span className="text-foreground-subtle">Total Runs</span>
          <span className="ml-1.5 font-mono text-foreground">{adaptation.totalRuns}</span>
        </div>
        {adaptation.lastTriggered && (
          <div>
            <span className="text-foreground-subtle">Last Triggered</span>
            <span className="ml-1.5 text-foreground">{adaptation.lastTriggered}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
