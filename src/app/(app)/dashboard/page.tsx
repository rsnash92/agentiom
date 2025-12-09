import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-foreground-muted text-xs sm:text-sm mt-1">Overview of your trading agents</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/agents/new">Create Agent</Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-card border border-border">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide">Total Balance</p>
                  <p className="text-lg sm:text-2xl font-semibold mt-1">$12,450</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-success mt-2 sm:mt-3">+12.5% this week</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide">Active Agents</p>
                  <p className="text-lg sm:text-2xl font-semibold mt-1">3</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <BotIcon className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-2 sm:mt-3">2 paused</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide">Today&apos;s PnL</p>
                  <p className="text-lg sm:text-2xl font-semibold mt-1 text-success">+$342</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-2 sm:mt-3">5 trades</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-foreground-muted uppercase tracking-wide">Win Rate</p>
                  <p className="text-lg sm:text-2xl font-semibold mt-1">68%</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-foreground-muted mt-2 sm:mt-3">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Agents and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-card border border-border">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
              <CardTitle className="text-sm sm:text-[15px] font-semibold">Active Agents</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                {agents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BotIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-[10px] sm:text-xs text-foreground-muted truncate">{agent.strategy}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <Badge variant={agent.status === 'active' ? 'success' : 'warning'} size="sm">
                        {agent.status}
                      </Badge>
                      <p className={`text-[10px] sm:text-xs mt-1 ${agent.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                        {agent.pnl >= 0 ? '+' : ''}{agent.pnl.toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
              <CardTitle className="text-sm sm:text-[15px] font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-background-secondary"
                  >
                    <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'trade' ? 'bg-primary/10' :
                      activity.type === 'decision' ? 'bg-accent/10' : 'bg-warning/10'
                    }`}>
                      {activity.type === 'trade' ? (
                        <ArrowsIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${activity.side === 'long' ? 'text-success' : 'text-error'}`} />
                      ) : activity.type === 'decision' ? (
                        <LightbulbIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                      ) : (
                        <AlertIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium">{activity.title}</p>
                      <p className="text-[10px] sm:text-xs text-foreground-muted truncate">{activity.description}</p>
                      <p className="text-[10px] sm:text-xs text-foreground-subtle mt-0.5 sm:mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Open Positions */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm sm:text-[15px] font-semibold">Open Positions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {positions.map((position, index) => (
                <div key={index} className="p-3 rounded-lg bg-background-secondary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{position.symbol}</span>
                      <Badge variant={position.side === 'long' ? 'success' : 'error'} size="sm">
                        {position.side.toUpperCase()}
                      </Badge>
                    </div>
                    <span className={`text-sm font-mono font-medium ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-foreground-muted">Agent: </span>
                      <span>{position.agent}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Size: </span>
                      <span className="font-mono">${position.size}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Entry: </span>
                      <span className="font-mono">${position.entry.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Leverage: </span>
                      <span className="font-mono">{position.leverage}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-foreground-muted border-b border-border">
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium">Side</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 font-medium">Entry</th>
                    <th className="pb-3 font-medium">Mark</th>
                    <th className="pb-3 font-medium">PnL</th>
                    <th className="pb-3 font-medium">Leverage</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr key={index} className="border-b border-border last:border-0 hover:bg-background-secondary transition-colors">
                      <td className="py-3 text-sm">{position.agent}</td>
                      <td className="py-3 text-sm font-medium">{position.symbol}</td>
                      <td className="py-3">
                        <Badge variant={position.side === 'long' ? 'success' : 'error'} size="sm">
                          {position.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm font-mono">${position.size.toLocaleString()}</td>
                      <td className="py-3 text-sm font-mono">${position.entry.toLocaleString()}</td>
                      <td className="py-3 text-sm font-mono">${position.mark.toLocaleString()}</td>
                      <td className={`py-3 text-sm font-mono font-medium ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm font-mono">{position.leverage}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sample data
const agents = [
  { id: '1', name: 'Momentum Alpha', strategy: 'BTC/ETH Momentum', status: 'active', pnl: 12.5 },
  { id: '2', name: 'Funding Hunter', strategy: 'Funding Rate Arb', status: 'active', pnl: 8.2 },
  { id: '3', name: 'Mean Reverter', strategy: 'RSI Mean Reversion', status: 'paused', pnl: -2.1 },
];

const activities = [
  { type: 'trade', side: 'long', title: 'Opened Long BTC', description: 'Momentum Alpha opened $500 long at $97,250', time: '5 minutes ago' },
  { type: 'decision', title: 'Analysis Complete', description: 'Funding Hunter analyzed market conditions - no action', time: '12 minutes ago' },
  { type: 'alert', title: 'Policy Warning', description: 'Mean Reverter approaching max drawdown threshold', time: '1 hour ago' },
  { type: 'trade', side: 'short', title: 'Closed Short ETH', description: 'Funding Hunter closed position with +$45.20 profit', time: '2 hours ago' },
];

const positions = [
  { agent: 'Momentum Alpha', symbol: 'BTC', side: 'long', size: 500, entry: 97250, mark: 97420, pnl: 8.75, leverage: 5 },
  { agent: 'Funding Hunter', symbol: 'ETH', side: 'short', size: 300, entry: 3890, mark: 3875, pnl: 11.58, leverage: 3 },
];

// Icons
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ArrowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
