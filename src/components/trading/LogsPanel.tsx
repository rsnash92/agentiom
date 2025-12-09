'use client';

import { useState } from 'react';
import { TabGroup, FormInput } from '@/components/ui/trading-form';

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
    description: 'Comprehensive analysis for BTC. Market showing neutral conditions with medium risk level.',
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
    description: 'Comprehensive analysis for BTC. Market showing neutral conditions with medium risk level.',
    author: 'BigTonyXBT',
    date: '03/12/2025',
    timeAgo: '3d ago',
    price: 0.10,
    isPremium: true,
    securedWith: 'X402',
  },
];

interface LogsPanelProps {
  onBuyAnalysis?: (analysisId: string) => void;
}

export function LogsPanel({ onBuyAnalysis }: LogsPanelProps) {
  const [activeTab, setActiveTab] = useState<'news' | 'analysis'>('analysis');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnalyses = sampleAnalyses.filter(
    (analysis) =>
      analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 space-y-3">
        <TabGroup
          tabs={[
            { value: 'news', label: 'News' },
            { value: 'analysis', label: 'Analysis' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'news' | 'analysis')}
        />

        <FormInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search analysis..."
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'news' ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-foreground-muted">
            <NewsIcon className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-xs">No news available</p>
            <p className="text-[10px] text-foreground-subtle mt-1">Check back later</p>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-foreground-muted">
            <AnalysisIcon className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-xs">No analysis found</p>
            <p className="text-[10px] text-foreground-subtle mt-1">Try adjusting your search</p>
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
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background-secondary rounded text-[10px] text-foreground-muted">
            <TrendIcon className="w-3 h-3" />
            <span className="capitalize">{analysis.type}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 rounded text-[10px] font-medium text-warning">
            <LockIcon className="w-2.5 h-2.5" />
            ${analysis.price.toFixed(2)}
          </div>
        </div>

        <h4 className="text-xs font-medium text-center mb-1">{analysis.title}</h4>
        <p className="text-[10px] text-foreground-muted text-center mb-3">{analysis.description}</p>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-foreground">{analysis.author}</span>
            <span className="text-foreground-subtle">·</span>
            <span className="text-foreground-subtle">{analysis.date}</span>
            <span className="text-primary">{analysis.timeAgo}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="px-2 py-1 bg-primary text-black text-[10px] font-medium rounded hover:bg-primary/90 transition-colors">
              HOLD
            </button>
            <button
              onClick={onBuy}
              className="px-2 py-1 bg-background-secondary text-[10px] font-medium rounded hover:bg-card transition-colors"
            >
              Buy
            </button>
          </div>
        </div>
      </div>

      {analysis.isPremium && (
        <div className="px-3 py-2 bg-background-secondary border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px]">
            <LockIcon className="w-2.5 h-2.5 text-foreground-subtle" />
            <span className="text-foreground-muted">Premium</span>
            <span className="text-foreground-subtle">·</span>
            <span className="text-primary">${analysis.price.toFixed(2)} USDC</span>
          </div>
          {analysis.securedWith && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-background border border-border/60 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[9px] text-foreground-muted">{analysis.securedWith}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Icons
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
