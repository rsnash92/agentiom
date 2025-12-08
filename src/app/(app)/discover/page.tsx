import Link from 'next/link';

export default function DiscoverPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12 border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Live on Hyperliquid
          </div>
          <h1 className="text-center text-4xl md:text-[42px] font-bold tracking-tight mb-3">
            Discover <span className="text-gradient">AI Trading Agents</span>
          </h1>
          <p className="text-center text-base text-foreground-muted mb-7 leading-relaxed max-w-[520px]">
            Deploy autonomous AI agents that trade perpetual futures 24/7. Copy top performers or create your own custom strategy.
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono">2,847</div>
              <div className="text-xs text-foreground-subtle mt-1">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono">$12.4M</div>
              <div className="text-xs text-foreground-subtle mt-1">Total Volume (24h)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono text-primary">+47.2%</div>
              <div className="text-xs text-foreground-subtle mt-1">Avg. PnL (30d)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-[28px] font-bold font-mono">1,203</div>
              <div className="text-xs text-foreground-subtle mt-1">Copiers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <div className="sticky top-14 z-40 border-b border-border bg-background">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterButton>All crypto</FilterButton>
            <FilterButton>Runtime: All</FilterButton>
            <FilterButton>PnL%: All</FilterButton>
            <FilterButton>Max drawdown: All</FilterButton>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <span>Sort by:</span>
            <button className="flex items-center gap-1.5 text-foreground-muted hover:text-foreground">
              <ChevronDownIcon className="w-3.5 h-3.5" />
              Featured
            </button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="max-w-[1600px] mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🔥</span> Top Performing Agents
        </h2>
        <Link href="/agents" className="text-sm text-primary flex items-center gap-1 hover:underline">
          View all
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Agent Grid */}
      <div className="max-w-[1600px] mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent, index) => (
            <AgentCard key={index} agent={agent} />
          ))}
        </div>
      </div>

      {/* Create CTA */}
      <div className="max-w-[1600px] mx-auto px-6 mb-6">
        <div className="p-8 text-center rounded-xl bg-gradient-to-r from-primary/10 to-primary-muted/10 border border-primary/20">
          <h3 className="text-xl font-semibold mb-2">Build Your Own AI Agent</h3>
          <p className="text-sm text-foreground-muted mb-5">
            Create a custom trading strategy using natural language. No coding required.
          </p>
          <Link
            href="/agents/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create Agent
          </Link>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}

function FilterButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-card border border-border rounded-md hover:border-border-hover transition-colors">
      {children}
      <ChevronDownIcon className="w-3.5 h-3.5 text-foreground-subtle" />
    </button>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-border-hover hover:bg-card-hover transition-all cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{agent.icon}</span>
            <span className="text-[15px] font-semibold">{agent.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 text-[11px] font-medium bg-background border border-border rounded text-foreground-muted">
              {agent.strategy}
            </span>
            {agent.side && (
              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                agent.side === 'Long'
                  ? 'text-primary bg-primary/10 border border-primary/30'
                  : 'text-error bg-error/10 border border-error/30'
              }`}>
                {agent.side}
              </span>
            )}
            {agent.leverage && (
              <span className="px-2 py-0.5 text-[11px] font-medium text-warning bg-warning/10 border border-warning/30 rounded">
                {agent.leverage}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-foreground-subtle">
          <UsersIcon className="w-3.5 h-3.5" />
          {agent.copiers}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className={`text-[28px] font-bold font-mono ${agent.pnl >= 0 ? 'text-primary' : 'text-error'}`}>
            {agent.pnl >= 0 ? '+' : ''}{agent.pnl.toFixed(2)}%
          </div>
          <div className="text-[11px] text-foreground-subtle mt-0.5">PnL%</div>
        </div>
        <div className="w-[120px] h-[50px]">
          <MiniChart positive={agent.pnl >= 0} />
        </div>
      </div>

      {/* Details */}
      <div className="flex justify-between mb-4 pb-4 border-b border-border">
        <div>
          <div className="text-sm font-semibold font-mono">{agent.runtime}</div>
          <div className="text-[11px] text-foreground-subtle mt-0.5">Runtime</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold font-mono">{agent.maxDrawdown}%</div>
          <div className="text-[11px] text-foreground-subtle mt-0.5">Max drawdown</div>
        </div>
      </div>

      {/* Pair */}
      <div className="flex items-center gap-1.5 mb-4">
        <div className={`pair-icon ${agent.pair.toLowerCase()}`} />
        <span className="text-xs text-foreground-muted">{agent.pair}/USDT</span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <button className="py-3 text-sm font-semibold bg-background border border-border rounded-lg hover:bg-card hover:border-border-hover transition-colors">
          Deposit
        </button>
        <button className="py-3 text-sm font-semibold bg-primary text-black rounded-lg hover:bg-primary-hover transition-colors">
          Trade
        </button>
      </div>
    </div>
  );
}

function MiniChart({ positive }: { positive: boolean }) {
  const color = positive ? '#2dd4a0' : '#ef4444';
  return (
    <svg viewBox="0 0 120 50" fill="none" className="w-full h-full">
      <path
        d={positive
          ? "M0 45 L15 42 L30 38 L45 35 L55 30 L65 28 L75 22 L85 18 L95 12 L105 8 L120 5"
          : "M0 15 L15 18 L30 22 L45 25 L55 30 L65 32 L75 38 L85 42 L95 45 L105 43 L120 48"
        }
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d={positive
          ? "M0 45 L15 42 L30 38 L45 35 L55 30 L65 28 L75 22 L85 18 L95 12 L105 8 L120 5 L120 50 L0 50 Z"
          : "M0 15 L15 18 L30 22 L45 25 L55 30 L65 32 L75 38 L85 42 L95 45 L105 43 L120 48 L120 50 L0 50 Z"
        }
        fill={`url(#gradient-${positive ? 'positive' : 'negative'})`}
        opacity="0.2"
      />
      <defs>
        <linearGradient id="gradient-positive" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2dd4a0"/>
          <stop offset="100%" stopColor="#2dd4a0" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gradient-negative" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// Icons
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

// Types
interface Agent {
  icon: string;
  name: string;
  strategy: string;
  side?: 'Long' | 'Short';
  leverage?: string;
  copiers: number;
  pnl: number;
  runtime: string;
  maxDrawdown: number;
  pair: string;
}

// Sample data
const agents: Agent[] = [
  {
    icon: '◆',
    name: 'BTCUSDT Perp',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '20.00x',
    copiers: 161,
    pnl: 97.20,
    runtime: '55d 7h',
    maxDrawdown: 31.83,
    pair: 'BTC',
  },
  {
    icon: '◉',
    name: 'ETHUSDT Perp',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '10.00x',
    copiers: 20,
    pnl: 50.33,
    runtime: '57d 2h',
    maxDrawdown: 49.73,
    pair: 'ETH',
  },
  {
    icon: '◆',
    name: 'BTCUSDT Perp',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '20.00x',
    copiers: 2,
    pnl: 27.23,
    runtime: '21d 6h',
    maxDrawdown: 23.70,
    pair: 'BTC',
  },
  {
    icon: '◆',
    name: 'BTCUSDT Perp',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '20.00x',
    copiers: 161,
    pnl: 97.20,
    runtime: '11d 3h',
    maxDrawdown: 11.83,
    pair: 'BTC',
  },
  {
    icon: '🏠',
    name: 'LOON/USDT',
    strategy: 'Spot grid',
    copiers: 905,
    pnl: 239.31,
    runtime: '388d 13h',
    maxDrawdown: 14.60,
    pair: 'SOL',
  },
  {
    icon: '◇',
    name: 'ETHUSDT Perp',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '10.00x',
    copiers: 3,
    pnl: 62.67,
    runtime: '57d 2h',
    maxDrawdown: 50.51,
    pair: 'ETH',
  },
  {
    icon: '◉',
    name: 'ETCUSDT Perp',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '10.00x',
    copiers: 115,
    pnl: 41.45,
    runtime: '56d 3h',
    maxDrawdown: 23.67,
    pair: 'ETH',
  },
  {
    icon: '🐕',
    name: 'DOGE/USDT',
    strategy: 'Futures DCA',
    side: 'Long',
    leverage: '50.00x',
    copiers: 803,
    pnl: 80.75,
    runtime: '193d 2h',
    maxDrawdown: 56.60,
    pair: 'DOGE',
  },
];
