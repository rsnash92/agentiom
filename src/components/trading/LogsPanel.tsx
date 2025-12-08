'use client';

import { useState } from 'react';

interface Analysis {
  id: string;
  type: 'platform' | 'market' | 'signal';
  title: string;
  description: string;
  author: string;
  date: string;
  timeAgo: string;
  price: number;
  isPremium: boolean;
  securedWith?: string;
}

const sampleAnalyses: Analysis[] = [
  {
    id: '1',
    type: 'platform',
    title: 'BTC Analysis',
    description: 'comprehensive analysis for BTC on platform. Market showing neutral conditions with medium risk level.',
    author: 'BigTonyXBT',
    date: '05/12/2025',
    timeAgo: '1d ago',
    price: 0.10,
    isPremium: true,
    securedWith: 'X402',
  },
  {
    id: '2',
    type: 'platform',
    title: 'BTC Analysis',
    description: 'comprehensive analysis for BTC on platform. Market showing neutral conditions with medium risk level.',
    author: 'BigTonyXBT',
    date: '03/12/2025',
    timeAgo: '3d ago',
    price: 0.10,
    isPremium: true,
    securedWith: 'X402',
  },
  {
    id: '3',
    type: 'platform',
    title: 'BTC Analysis',
    description: 'comprehensive analysis for BTC on platform. Market showing neutral conditions with medium risk level.',
    author: 'BigTonyXBT',
    date: '02/12/2025',
    timeAgo: '4d ago',
    price: 0.10,
    isPremium: true,
    securedWith: 'X402',
  },
  {
    id: '4',
    type: 'platform',
    title: 'BTC Analysis',
    description: 'comprehensive analysis for BTC on platform. Market showing neutral conditions with medium risk level.',
    author: 'BigTonyXBT',
    date: '01/12/2025',
    timeAgo: '5d ago',
    price: 0.10,
    isPremium: true,
    securedWith: 'X402',
  },
];

type TabType = 'news' | 'analysis';

interface LogsPanelProps {
  onBuyAnalysis?: (analysisId: string) => void;
}

export function LogsPanel({ onBuyAnalysis }: LogsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAnalyses = sampleAnalyses.filter(
    (analysis) =>
      analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Central Intelligence Feed</h3>
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              1664 analyses
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-background rounded-lg p-1 mb-3">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'news'
                ? 'bg-card text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <NewsIcon className="w-4 h-4" />
            News
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'analysis'
                ? 'bg-primary text-black'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <AnalysisIcon className="w-4 h-4" />
            Analysis
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search analysis..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary text-black border-primary'
                : 'bg-card border-border hover:border-border-hover text-foreground-muted hover:text-foreground'
            }`}
          >
            <FilterIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'news' ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
            <NewsIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No news available</p>
            <p className="text-xs text-foreground-subtle mt-1">Check back later for updates</p>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
            <AnalysisIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No analysis found</p>
            <p className="text-xs text-foreground-subtle mt-1">Try adjusting your search</p>
          </div>
        ) : (
          filteredAnalyses.map((analysis) => (
            <AnalysisCard
              key={analysis.id}
              analysis={analysis}
              onBuy={() => onBuyAnalysis?.(analysis.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface AnalysisCardProps {
  analysis: Analysis;
  onBuy?: () => void;
}

function AnalysisCard({ analysis, onBuy }: AnalysisCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-background rounded-md">
            <TrendIcon className="w-3.5 h-3.5 text-foreground-muted" />
            <span className="text-xs text-foreground-muted capitalize">{analysis.type}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 rounded-md">
            <LockIcon className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-semibold text-orange-400">${analysis.price.toFixed(2)}</span>
          </div>
        </div>

        {/* Title & Description */}
        <h4 className="text-base font-semibold text-center mb-2">{analysis.title}</h4>
        <p className="text-xs text-foreground-muted text-center mb-4">{analysis.description}</p>

        {/* Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground">{analysis.author}</span>
            <span className="text-foreground-subtle">·</span>
            <ClockIcon className="w-3 h-3 text-foreground-subtle" />
            <span className="text-foreground-subtle">{analysis.date}</span>
            <span className="text-primary">{analysis.timeAgo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors">
              <MinusIcon className="w-3 h-3" />
              HOLD
            </button>
            <button
              onClick={onBuy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground-subtle/20 text-foreground text-xs font-medium rounded-md hover:bg-foreground-subtle/30 transition-colors"
            >
              <CopyIcon className="w-3 h-3" />
              Buy
            </button>
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      {analysis.isPremium && (
        <div className="px-4 py-2.5 bg-background border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <LockIcon className="w-3 h-3 text-foreground-subtle" />
            <span className="text-foreground-muted">Premium Content</span>
            <span className="text-foreground-subtle">·</span>
            <span className="text-primary">One-time payment of ${analysis.price.toFixed(2)} USDC</span>
          </div>
          {analysis.securedWith && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-full">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[10px] text-foreground-muted">Secured with {analysis.securedWith}</span>
              <InfoIcon className="w-3 h-3 text-foreground-subtle" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Icons
function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

function NewsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
    </svg>
  );
}

function AnalysisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
