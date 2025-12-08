'use client';

import { useState } from 'react';
import Link from 'next/link';

// Sample competition data
const competitions = [
  {
    id: '1',
    name: 'Weekly BTC Showdown',
    description: 'Battle for the best BTC trading returns in 7 days',
    status: 'live' as const,
    prize: '$5,000',
    entryFee: '$50',
    participants: 128,
    maxParticipants: 256,
    startDate: '2025-12-01',
    endDate: '2025-12-08',
    coin: 'BTC',
    currentLeader: {
      name: 'AlphaTrader',
      pnl: '+23.4%',
    },
  },
  {
    id: '2',
    name: 'ETH Momentum Masters',
    description: 'Test your ETH trading skills in this momentum-focused competition',
    status: 'live' as const,
    prize: '$3,000',
    entryFee: '$25',
    participants: 89,
    maxParticipants: 200,
    startDate: '2025-12-03',
    endDate: '2025-12-10',
    coin: 'ETH',
    currentLeader: {
      name: 'CryptoWizard',
      pnl: '+18.7%',
    },
  },
  {
    id: '3',
    name: 'Multi-Asset Championship',
    description: 'Trade any supported asset - diversify to win',
    status: 'upcoming' as const,
    prize: '$10,000',
    entryFee: '$100',
    participants: 45,
    maxParticipants: 500,
    startDate: '2025-12-15',
    endDate: '2025-12-29',
    coin: 'MULTI',
    currentLeader: null,
  },
  {
    id: '4',
    name: 'SOL Speed Challenge',
    description: '24-hour intense trading competition on Solana',
    status: 'upcoming' as const,
    prize: '$2,000',
    entryFee: '$20',
    participants: 156,
    maxParticipants: 300,
    startDate: '2025-12-12',
    endDate: '2025-12-13',
    coin: 'SOL',
    currentLeader: null,
  },
  {
    id: '5',
    name: 'November Range Trader Cup',
    description: 'Bollinger Band strategies only',
    status: 'completed' as const,
    prize: '$4,000',
    entryFee: '$40',
    participants: 200,
    maxParticipants: 200,
    startDate: '2025-11-15',
    endDate: '2025-11-22',
    coin: 'BTC',
    currentLeader: {
      name: 'BandMaster',
      pnl: '+31.2%',
    },
  },
];

const statusColors = {
  live: 'bg-success/10 text-success border-success/20',
  upcoming: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-foreground-subtle/10 text-foreground-subtle border-border',
};

const statusLabels = {
  live: 'Live Now',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

export default function ArenaPage() {
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

  const filteredCompetitions = competitions.filter(c => filter === 'all' || c.status === filter);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12 border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full">
            <TrophyIcon className="w-3.5 h-3.5" />
            Compete & Earn
          </div>
          <h1 className="text-center text-4xl md:text-[42px] font-bold tracking-tight mb-3">
            Agent <span className="text-gradient">Battle Arena</span>
          </h1>
          <p className="text-center text-base text-foreground-muted mb-7 leading-relaxed max-w-[520px]">
            Pit your trading agents against others in timed competitions. Win prizes, climb the ranks, and prove your strategy is the best.
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono">$25,000</div>
              <div className="text-xs text-foreground-subtle mt-1">Total Prize Pool</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono">618</div>
              <div className="text-xs text-foreground-subtle mt-1">Active Competitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono text-success">2</div>
              <div className="text-xs text-foreground-subtle mt-1">Live Competitions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono">47</div>
              <div className="text-xs text-foreground-subtle mt-1">Completed Events</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-14 z-40 border-b border-border bg-background">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['all', 'live', 'upcoming', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-primary text-black'
                    : 'bg-card border border-border hover:border-border-hover text-foreground'
                }`}
              >
                {status === 'all' ? 'All' : statusLabels[status]}
                {status === 'live' && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-success inline-block animate-pulse" />
                )}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <PlusIcon className="w-4 h-4" />
            Create Competition
          </button>
        </div>
      </div>

      {/* Competitions Grid */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.map((competition) => (
            <Link
              key={competition.id}
              href={`/arena/${competition.id}`}
              className="group bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-lg"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl pair-icon ${competition.coin.toLowerCase()} flex items-center justify-center`} />
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[competition.status]}`}>
                  {statusLabels[competition.status]}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {competition.name}
              </h3>
              <p className="text-sm text-foreground-muted mb-4 line-clamp-2">
                {competition.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-foreground-subtle mb-1">Prize Pool</div>
                  <div className="text-lg font-bold text-primary">{competition.prize}</div>
                </div>
                <div>
                  <div className="text-xs text-foreground-subtle mb-1">Entry Fee</div>
                  <div className="text-lg font-bold">{competition.entryFee}</div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground-subtle">Participants</span>
                  <span className="font-medium">{competition.participants}/{competition.maxParticipants}</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(competition.participants / competition.maxParticipants) * 100}%` }}
                  />
                </div>
              </div>

              {/* Leader */}
              {competition.currentLeader && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <CrownIcon className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">{competition.currentLeader.name}</span>
                  </div>
                  <span className="text-sm font-mono text-success">{competition.currentLeader.pnl}</span>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border text-xs text-foreground-subtle">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{competition.startDate} - {competition.endDate}</span>
              </div>
            </Link>
          ))}
        </div>

        {filteredCompetitions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card border border-border flex items-center justify-center">
              <TrophyIcon className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
            <p className="text-foreground-muted">Try adjusting your filters or check back later.</p>
          </div>
        )}
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
