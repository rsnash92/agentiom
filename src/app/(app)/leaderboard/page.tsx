'use client';

import { useState } from 'react';
import Link from 'next/link';

// Sample leaderboard data
const traders = [
  {
    rank: 1,
    name: 'AlphaTrader',
    avatar: '🦁',
    agentCount: 12,
    totalPnl: '+$847,293',
    pnlPct: '+284.3%',
    winRate: 78.5,
    totalTrades: 2847,
    volume: '$12.4M',
    streak: 14,
    badge: 'diamond',
  },
  {
    rank: 2,
    name: 'CryptoWizard',
    avatar: '🧙',
    agentCount: 8,
    totalPnl: '+$634,128',
    pnlPct: '+198.7%',
    winRate: 72.3,
    totalTrades: 1983,
    volume: '$8.7M',
    streak: 8,
    badge: 'diamond',
  },
  {
    rank: 3,
    name: 'BandMaster',
    avatar: '🎸',
    agentCount: 5,
    totalPnl: '+$521,847',
    pnlPct: '+167.2%',
    winRate: 68.9,
    totalTrades: 3201,
    volume: '$15.2M',
    streak: 5,
    badge: 'platinum',
  },
  {
    rank: 4,
    name: 'MomentumKing',
    avatar: '👑',
    agentCount: 15,
    totalPnl: '+$489,234',
    pnlPct: '+145.8%',
    winRate: 65.4,
    totalTrades: 4521,
    volume: '$22.1M',
    streak: 3,
    badge: 'platinum',
  },
  {
    rank: 5,
    name: 'TrendSurfer',
    avatar: '🏄',
    agentCount: 7,
    totalPnl: '+$412,987',
    pnlPct: '+128.4%',
    winRate: 71.2,
    totalTrades: 1876,
    volume: '$9.3M',
    streak: 11,
    badge: 'gold',
  },
  {
    rank: 6,
    name: 'ScalpMaster',
    avatar: '⚡',
    agentCount: 3,
    totalPnl: '+$387,123',
    pnlPct: '+112.9%',
    winRate: 82.1,
    totalTrades: 8934,
    volume: '$31.2M',
    streak: 2,
    badge: 'gold',
  },
  {
    rank: 7,
    name: 'RangeTrader',
    avatar: '📊',
    agentCount: 4,
    totalPnl: '+$298,456',
    pnlPct: '+98.7%',
    winRate: 69.8,
    totalTrades: 2134,
    volume: '$7.8M',
    streak: 6,
    badge: 'gold',
  },
  {
    rank: 8,
    name: 'DeFiDegen',
    avatar: '🦍',
    agentCount: 9,
    totalPnl: '+$267,891',
    pnlPct: '+87.3%',
    winRate: 61.2,
    totalTrades: 5678,
    volume: '$18.9M',
    streak: 0,
    badge: 'silver',
  },
  {
    rank: 9,
    name: 'AIQuantum',
    avatar: '🤖',
    agentCount: 6,
    totalPnl: '+$234,567',
    pnlPct: '+76.5%',
    winRate: 67.4,
    totalTrades: 1567,
    volume: '$6.2M',
    streak: 4,
    badge: 'silver',
  },
  {
    rank: 10,
    name: 'SwingKing',
    avatar: '🏌️',
    agentCount: 2,
    totalPnl: '+$198,234',
    pnlPct: '+64.2%',
    winRate: 74.8,
    totalTrades: 876,
    volume: '$4.1M',
    streak: 7,
    badge: 'silver',
  },
];

const badgeColors = {
  diamond: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  platinum: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  silver: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  bronze: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

type TimeFrame = '24h' | '7d' | '30d' | 'all';
type SortBy = 'pnl' | 'winRate' | 'volume' | 'trades';

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<TimeFrame>('30d');
  const [sortBy, setSortBy] = useState<SortBy>('pnl');

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12 border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full">
            <TrophyIcon className="w-3.5 h-3.5" />
            Global Rankings
          </div>
          <h1 className="text-center text-4xl md:text-[42px] font-bold tracking-tight mb-3">
            Top <span className="text-gradient">Traders</span>
          </h1>
          <p className="text-center text-base text-foreground-muted mb-7 leading-relaxed max-w-[520px]">
            The most successful AI trading agents on Hyperliquid. Learn from the best and climb the ranks.
          </p>

          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-4 mt-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-card border-2 border-gray-400 flex items-center justify-center text-2xl mb-2">
                {traders[1].avatar}
              </div>
              <span className="text-sm font-semibold">{traders[1].name}</span>
              <span className="text-xs text-foreground-muted">{traders[1].pnlPct}</span>
              <div className="w-20 h-16 bg-gray-400/20 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <CrownIcon className="w-6 h-6 text-yellow-500 mb-1" />
              <div className="w-20 h-20 rounded-full bg-card border-2 border-yellow-500 flex items-center justify-center text-3xl mb-2">
                {traders[0].avatar}
              </div>
              <span className="text-sm font-semibold">{traders[0].name}</span>
              <span className="text-xs text-primary">{traders[0].pnlPct}</span>
              <div className="w-24 h-24 bg-yellow-500/20 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-3xl font-bold text-yellow-500">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-card border-2 border-orange-500 flex items-center justify-center text-2xl mb-2">
                {traders[2].avatar}
              </div>
              <span className="text-sm font-semibold">{traders[2].name}</span>
              <span className="text-xs text-foreground-muted">{traders[2].pnlPct}</span>
              <div className="w-20 h-12 bg-orange-500/20 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-orange-500">3</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-14 z-40 border-b border-border bg-background">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
              {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeframe === tf
                      ? 'bg-primary text-black'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {tf === 'all' ? 'All Time' : tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-muted">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
            >
              <option value="pnl">PnL</option>
              <option value="winRate">Win Rate</option>
              <option value="volume">Volume</option>
              <option value="trades">Trades</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-background-secondary text-xs font-medium text-foreground-subtle uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">Trader</div>
            <div className="col-span-2 text-right">Total PnL</div>
            <div className="col-span-1 text-right">Win Rate</div>
            <div className="col-span-1 text-right">Trades</div>
            <div className="col-span-2 text-right">Volume</div>
            <div className="col-span-1 text-right">Streak</div>
            <div className="col-span-1 text-right">Agents</div>
          </div>

          {/* Table Body */}
          {traders.map((trader, index) => (
            <Link
              key={trader.rank}
              href={`/traders/${trader.name.toLowerCase()}`}
              className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-background transition-colors ${
                index !== traders.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              {/* Rank */}
              <div className="col-span-1">
                <span className={`text-lg font-bold ${
                  trader.rank === 1 ? 'text-yellow-500' :
                  trader.rank === 2 ? 'text-gray-400' :
                  trader.rank === 3 ? 'text-orange-500' :
                  'text-foreground-muted'
                }`}>
                  #{trader.rank}
                </span>
              </div>

              {/* Trader Info */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-lg">
                  {trader.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{trader.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${badgeColors[trader.badge as keyof typeof badgeColors]}`}>
                      {trader.badge.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total PnL */}
              <div className="col-span-2 text-right">
                <div className="text-success font-mono font-semibold">{trader.totalPnl}</div>
                <div className="text-xs text-success/70">{trader.pnlPct}</div>
              </div>

              {/* Win Rate */}
              <div className="col-span-1 text-right">
                <span className="font-mono">{trader.winRate}%</span>
              </div>

              {/* Trades */}
              <div className="col-span-1 text-right">
                <span className="font-mono">{trader.totalTrades.toLocaleString()}</span>
              </div>

              {/* Volume */}
              <div className="col-span-2 text-right">
                <span className="font-mono">{trader.volume}</span>
              </div>

              {/* Streak */}
              <div className="col-span-1 text-right">
                {trader.streak > 0 ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <FireIcon className="w-4 h-4" />
                    {trader.streak}
                  </span>
                ) : (
                  <span className="text-foreground-muted">-</span>
                )}
              </div>

              {/* Agents */}
              <div className="col-span-1 text-right">
                <span className="font-mono">{trader.agentCount}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-foreground-muted">Showing 1-10 of 2,847 traders</span>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:border-border-hover transition-colors disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:border-border-hover transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 18.5l3-9 4 4 3-8 3 8 4-4 3 9h-17z" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-3.6 0-8-3-8-10 0-3 1.9-6.5 3.6-8.6.5-.7 1.4-.9 2.1-.4.4.3.6.7.6 1.1 0 2.1 1.3 3.9 3.7 3.9 3.3 0 4-2.7 4-5.5 0-.6.4-1.2 1-1.4.6-.2 1.3 0 1.7.5C22.4 5 24 8.4 24 13c0 7-4.4 10-8 10h-4z" />
    </svg>
  );
}
