'use client';

import { useState } from 'react';

interface Version {
  id: string;
  version: string;
  description: string;
  timestamp: string;
  agentCount: number;
  goalCount: number;
  type: 'major' | 'minor' | 'patch';
}

interface ApiKeysPanelProps {
  versions?: Version[];
  totalVersions?: number;
  agentCount?: number;
  goalCount?: number;
  onRefresh?: () => void;
}

export function ApiKeysPanel({
  versions = [],
  totalVersions = 0,
  agentCount = 0,
  goalCount = 0,
  onRefresh,
}: ApiKeysPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredVersions = versions.filter(
    (version) =>
      version.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      version.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <GitBranchIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Version History</h3>
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                {totalVersions} versions tracked
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full">
            <DocumentIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">
              {agentCount} agent, {goalCount} goal
            </span>
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
              placeholder="Search versions..."
              className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2.5 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors"
            title="More options"
          >
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredVersions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
            <GitBranchEmptyIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm text-foreground-subtle">No version history found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredVersions.map((version) => (
              <VersionCard key={version.id} version={version} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface VersionCardProps {
  version: Version;
}

function VersionCard({ version }: VersionCardProps) {
  const typeColors = {
    major: 'bg-error/10 text-error',
    minor: 'bg-warning/10 text-warning',
    patch: 'bg-success/10 text-success',
  };

  return (
    <div className="p-4 hover:bg-card/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranchIcon className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">{version.version}</h4>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${typeColors[version.type]}`}>
            {version.type}
          </span>
        </div>
        <span className="text-xs text-foreground-subtle">{version.timestamp}</span>
      </div>
      <p className="text-xs text-foreground-muted mb-2">{version.description}</p>
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <DocumentIcon className="w-3 h-3 text-foreground-subtle" />
          <span className="text-foreground-subtle">{version.agentCount} agents</span>
        </div>
        <div className="flex items-center gap-1">
          <TargetIcon className="w-3 h-3 text-foreground-subtle" />
          <span className="text-foreground-subtle">{version.goalCount} goals</span>
        </div>
      </div>
    </div>
  );
}

// Icons
function GitBranchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  );
}

function GitBranchEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
