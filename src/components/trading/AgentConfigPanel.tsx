'use client';

import { useState } from 'react';
import { FormInput, SegmentedControl } from '@/components/ui/trading-form';

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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'disabled', label: 'Disabled' },
];

export function AgentConfigPanel({
  adaptations = [],
  activeCount = 0,
  totalCount = 0,
  avgConfidence = 0,
  avgSuccess = 0,
  onRefresh,
}: AgentConfigPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAdaptations = adaptations.filter(
    (adaptation) =>
      (statusFilter === 'all' || adaptation.status === statusFilter) &&
      (adaptation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adaptation.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <GearIcon className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h3 className="text-xs font-medium">Workflow Adaptations</h3>
              <div className="text-[10px] text-foreground-muted">
                {activeCount} active · {totalCount} total · {avgSuccess}% success
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-[10px] font-medium text-primary">{avgConfidence}% confidence</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <FormInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search adaptations..."
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-background-secondary text-foreground-muted hover:text-foreground transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>

        <SegmentedControl
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredAdaptations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-background-secondary flex items-center justify-center mb-3">
              <GearIcon className="w-6 h-6 text-foreground-subtle" />
            </div>
            <h4 className="text-xs font-medium text-foreground-muted mb-1">No Adaptations</h4>
            <p className="text-[10px] text-foreground-subtle">
              No workflow adaptations created yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
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
    <div className="p-3 hover:bg-background-secondary/50 transition-colors">
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium">{adaptation.name}</h4>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${
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
        <span className="text-[10px] text-foreground-subtle">{adaptation.confidence}%</span>
      </div>
      <p className="text-[10px] text-foreground-muted mb-2">{adaptation.description}</p>
      <div className="flex items-center gap-3 text-[10px]">
        <div>
          <span className="text-foreground-subtle">Success</span>
          <span className={`ml-1 font-mono ${adaptation.successRate >= 50 ? 'text-success' : 'text-error'}`}>
            {adaptation.successRate}%
          </span>
        </div>
        <div>
          <span className="text-foreground-subtle">Runs</span>
          <span className="ml-1 font-mono text-foreground">{adaptation.totalRuns}</span>
        </div>
        {adaptation.lastTriggered && (
          <div>
            <span className="text-foreground-subtle">Last</span>
            <span className="ml-1 text-foreground">{adaptation.lastTriggered}</span>
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
