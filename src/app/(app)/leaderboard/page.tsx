'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TradingMode = 'demo' | 'live';
type TimeFilter = 'all' | '7d' | '30d';

interface LeaderboardAgent {
  rank: number;
  agentName: string;
  owner: string;
  accountValue: number;
  totalTrades: number;
  totalPnl: number;
  pnlPct: number;
  isCurrentUser?: boolean;
}

// Sample leaderboard data - Demo Trading Agents
const demoLeaderboardData: LeaderboardAgent[] = [
  { rank: 1, agentName: 'cinktest1', owner: '0x103D...99Ff75', accountValue: 25186.82, totalTrades: 581, totalPnl: 20186.82, pnlPct: 403.74 },
  { rank: 2, agentName: '豆包TEST', owner: '0x37c6...C861fE', accountValue: 22032.41, totalTrades: 807, totalPnl: 17032.41, pnlPct: 340.65 },
  { rank: 3, agentName: 'nice', owner: '0xB3f6...d22DcD', accountValue: 17733.87, totalTrades: 335, totalPnl: 12733.87, pnlPct: 254.68 },
  { rank: 4, agentName: 'longeth', owner: '0x277c...e143Bb', accountValue: 14650.49, totalTrades: 649, totalPnl: 9650.49, pnlPct: 193.01 },
  { rank: 5, agentName: 'prodtest3', owner: '0x36F9...7FbBe4', accountValue: 13992.07, totalTrades: 1282, totalPnl: 8992.07, pnlPct: 179.84 },
  { rank: 6, agentName: 'test4', owner: '0x36F9...7FbBe4', accountValue: 13198.96, totalTrades: 1338, totalPnl: 8198.96, pnlPct: 163.98 },
  { rank: 7, agentName: 'beverly', owner: 'beverl...il.com', accountValue: 12532.16, totalTrades: 885, totalPnl: 7532.16, pnlPct: 150.64 },
  { rank: 8, agentName: 'shortalt', owner: '0x0a9C...3fFf4E', accountValue: 10420.16, totalTrades: 1235, totalPnl: 5420.16, pnlPct: 108.40 },
  { rank: 9, agentName: 'NewTrader1', owner: '0x37c6...C861fE', accountValue: 10186.98, totalTrades: 816, totalPnl: 5186.98, pnlPct: 103.74 },
  { rank: 10, agentName: 'king', owner: '0x718d...64816B', accountValue: 9887.57, totalTrades: 343, totalPnl: 4887.57, pnlPct: 97.75 },
];

// Sample leaderboard data - Live Trading Agents
const liveLeaderboardData: LeaderboardAgent[] = [
  { rank: 1, agentName: 'WhaleHunter', owner: '0x8a2F...9B3c21', accountValue: 158420.50, totalTrades: 2341, totalPnl: 83420.50, pnlPct: 111.23 },
  { rank: 2, agentName: 'AlphaSeeker', owner: '0x91Cd...4E7f82', accountValue: 142890.33, totalTrades: 1876, totalPnl: 67890.33, pnlPct: 90.52 },
  { rank: 3, agentName: 'TrendMaster', owner: '0xF3a8...2C9d45', accountValue: 128765.21, totalTrades: 3245, totalPnl: 53765.21, pnlPct: 71.69 },
  { rank: 4, agentName: 'MomentumPro', owner: '0x5B12...8Ae3c7', accountValue: 95234.88, totalTrades: 1523, totalPnl: 35234.88, pnlPct: 58.72 },
  { rank: 5, agentName: 'DeltaNeutral', owner: '0xC7d9...1F4b92', accountValue: 87650.42, totalTrades: 2187, totalPnl: 27650.42, pnlPct: 46.08 },
];

// Sample user's agents
const myDemoAgents: LeaderboardAgent[] = [
  { rank: 243, agentName: 'DEMOROBQUANT', owner: 'robert...il.com', accountValue: 4898.71, totalTrades: 77, totalPnl: -101.29, pnlPct: -2.03, isCurrentUser: true },
];

const myLiveAgents: LeaderboardAgent[] = [];

export default function LeaderboardPage() {
  const [tradingMode, setTradingMode] = useState<TradingMode>('demo');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [myAgentsTab, setMyAgentsTab] = useState<TradingMode>('demo');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Update timestamp
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
    setLastUpdate(formatted);
  }, []);

  const leaderboardData = tradingMode === 'demo' ? demoLeaderboardData : liveLeaderboardData;
  const myAgents = myAgentsTab === 'demo' ? myDemoAgents : myLiveAgents;

  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPnl = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return prefix + formatCurrency(value);
  };

  const formatPct = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return prefix + value.toFixed(2) + '%';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Main Leaderboard Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
          {/* Header with Tabs and Time Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border gap-4">
            {/* Trading Mode Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTradingMode('demo')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition-colors ${
                  tradingMode === 'demo'
                    ? 'text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                DEMO TRADING AGENTS
              </button>
              <button
                onClick={() => setTradingMode('live')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition-colors ${
                  tradingMode === 'live'
                    ? 'text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                LIVE TRADING AGENTS
              </button>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-1 bg-background rounded-lg p-1">
              {(['all', '7d', '30d'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeFilter(tf)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    timeFilter === tf
                      ? 'bg-foreground-muted/20 text-foreground'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {tf === 'all' ? 'ALL' : tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-7 gap-4 px-6 py-3 bg-background text-[11px] font-medium text-foreground-muted uppercase tracking-wider">
            <div>RANK</div>
            <div>AGENT NAME</div>
            <div>OWNER</div>
            <div className="text-right">ACCOUNT VALUE</div>
            <div className="text-right">TOTAL TRADES</div>
            <div className="text-right">TOTAL P&L</div>
            <div className="text-right">PNL%</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border">
            {leaderboardData.map((agent) => (
              <div
                key={agent.rank}
                className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 items-center hover:bg-background/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex items-center gap-2">
                  {agent.rank <= 3 ? (
                    <span className="text-yellow-500 text-sm">
                      <CrownIcon className="w-4 h-4 inline mr-1" />
                      {agent.rank.toString().padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-foreground-muted font-mono text-sm">
                      {agent.rank.toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Agent Name */}
                <div className="text-sm font-medium text-foreground">
                  {agent.agentName}
                </div>

                {/* Owner - Hidden on mobile */}
                <div className="hidden sm:block text-sm font-mono text-foreground-muted">
                  {agent.owner}
                </div>

                {/* Account Value */}
                <div className="text-right text-sm font-mono text-foreground sm:block hidden">
                  {formatCurrency(agent.accountValue)}
                </div>

                {/* Total Trades - Hidden on mobile */}
                <div className="hidden sm:block text-right text-sm font-mono text-foreground-muted">
                  {agent.totalTrades.toLocaleString()}
                </div>

                {/* Total P&L */}
                <div className={`text-right text-sm font-mono ${agent.totalPnl >= 0 ? 'text-success' : 'text-error'} sm:block hidden`}>
                  {formatPnl(agent.totalPnl)}
                </div>

                {/* PNL% */}
                <div className={`text-right text-sm font-mono ${agent.pnlPct >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatPct(agent.pnlPct)}
                </div>

                {/* Mobile: Extra row for more data */}
                <div className="sm:hidden col-span-2 flex justify-between text-xs text-foreground-muted pt-1">
                  <span>{formatCurrency(agent.accountValue)}</span>
                  <span className={agent.totalPnl >= 0 ? 'text-success' : 'text-error'}>
                    {formatPnl(agent.totalPnl)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Last Update Footer */}
          <div className="px-6 py-3 border-t border-border">
            <span className="text-[11px] text-foreground-subtle font-mono">
              LAST UPDATE: {lastUpdate}
            </span>
          </div>
        </div>

        {/* My Agents Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border gap-4">
            <h2 className="text-sm font-semibold tracking-wide">MY AGENTS</h2>

            {/* My Agents Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMyAgentsTab('demo')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition-colors ${
                  myAgentsTab === 'demo'
                    ? 'text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                MY DEMO TRADING AGENTS
              </button>
              <button
                onClick={() => setMyAgentsTab('live')}
                className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition-colors ${
                  myAgentsTab === 'live'
                    ? 'text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                MY LIVE TRADING AGENTS
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-7 gap-4 px-6 py-3 bg-background text-[11px] font-medium text-foreground-muted uppercase tracking-wider">
            <div>RANK</div>
            <div>AGENT NAME</div>
            <div>OWNER</div>
            <div className="text-right">ACCOUNT VALUE</div>
            <div className="text-right">TOTAL TRADES</div>
            <div className="text-right">TOTAL P&L</div>
            <div className="text-right">PNL%</div>
          </div>

          {/* Table Body */}
          {myAgents.length > 0 ? (
            <div className="divide-y divide-border">
              {myAgents.map((agent) => (
                <div
                  key={agent.rank}
                  className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 items-center hover:bg-background/50 transition-colors"
                >
                  {/* Rank */}
                  <div className="text-sm font-mono text-foreground-muted">
                    {agent.rank}
                  </div>

                  {/* Agent Name */}
                  <div className="text-sm font-medium text-foreground">
                    {agent.agentName}
                  </div>

                  {/* Owner - Hidden on mobile */}
                  <div className="hidden sm:block text-sm font-mono text-foreground-muted">
                    {agent.owner}
                  </div>

                  {/* Account Value */}
                  <div className="text-right text-sm font-mono text-foreground sm:block hidden">
                    {formatCurrency(agent.accountValue)}
                  </div>

                  {/* Total Trades - Hidden on mobile */}
                  <div className="hidden sm:block text-right text-sm font-mono text-foreground-muted">
                    {agent.totalTrades.toLocaleString()}
                  </div>

                  {/* Total P&L */}
                  <div className={`text-right text-sm font-mono ${agent.totalPnl >= 0 ? 'text-success' : 'text-error'} sm:block hidden`}>
                    {formatPnl(agent.totalPnl)}
                  </div>

                  {/* PNL% */}
                  <div className={`text-right text-sm font-mono ${agent.pnlPct >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatPct(agent.pnlPct)}
                  </div>

                  {/* Mobile: Extra row for more data */}
                  <div className="sm:hidden col-span-2 flex justify-between text-xs text-foreground-muted pt-1">
                    <span>{formatCurrency(agent.accountValue)}</span>
                    <span className={agent.totalPnl >= 0 ? 'text-success' : 'text-error'}>
                      {formatPnl(agent.totalPnl)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-foreground-muted text-sm">
                {myAgentsTab === 'demo'
                  ? 'You have no demo trading agents yet.'
                  : 'You have no live trading agents yet.'}
              </p>
              <Link
                href="/agents/new"
                className="inline-block mt-4 px-4 py-2 bg-primary text-black text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Agent
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}
