'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import type { PerformanceStats } from '@/lib/agent/performance-stats';

interface AgentPerformanceStatsProps {
  agentId: string;
  compact?: boolean;
}

interface StatsResponse {
  stats: PerformanceStats;
  summary: {
    currentBalance: number;
    unrealizedPnl: number;
    currentEquity: number;
    initialBalance: number;
    totalReturn: number;
    openPositions: number;
    isDemo: boolean;
    status: string;
  };
}

export function AgentPerformanceStats({ agentId, compact = false }: AgentPerformanceStatsProps) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    async function fetchStats() {
      if (!agentId) return;

      try {
        setLoading(true);
        const token = await getAccessToken();
        const res = await fetch(`/api/agents/${agentId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to fetch stats');

        const statsData = await res.json();
        setData(statsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [agentId, getAccessToken]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-20 bg-card rounded-xl" />
        <div className="h-32 bg-card rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="text-center text-foreground-muted text-sm">
          {error || 'No statistics available'}
        </div>
      </div>
    );
  }

  const { stats, summary } = data;

  // Compact view for sidebar/widget
  if (compact) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <ChartIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Performance</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            color={stats.winRate >= 50 ? 'success' : 'error'}
          />
          <StatBox
            label="Profit Factor"
            value={stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)}
            color={stats.profitFactor >= 1 ? 'success' : 'error'}
          />
          <StatBox
            label="Total P&L"
            value={formatCurrency(stats.totalPnl)}
            color={stats.totalPnl >= 0 ? 'success' : 'error'}
          />
          <StatBox
            label="Trades"
            value={stats.totalTrades.toString()}
            color="foreground"
          />
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-3">
      {/* Summary Card */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <ChartIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Performance Overview</span>
          {summary.isDemo && (
            <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-warning/20 text-warning rounded-full">
              DEMO
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${summary.totalReturn >= 0 ? 'text-success' : 'text-error'}`}>
              {summary.totalReturn >= 0 ? '+' : ''}{summary.totalReturn.toFixed(1)}%
            </div>
            <div className="text-[10px] text-foreground-subtle uppercase">Total Return</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{formatCurrency(summary.currentEquity)}</div>
            <div className="text-[10px] text-foreground-subtle uppercase">Equity</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${stats.winRate >= 50 ? 'text-success' : 'text-error'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-foreground-subtle uppercase">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{stats.totalTrades}</div>
            <div className="text-[10px] text-foreground-subtle uppercase">Trades</div>
          </div>
        </div>

        {/* Unrealized P&L */}
        {summary.openPositions > 0 && (
          <div className="flex items-center justify-between p-2 bg-background rounded-lg text-xs">
            <span className="text-foreground-muted">
              Unrealized P&L ({summary.openPositions} open)
            </span>
            <span className={summary.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}>
              {formatCurrency(summary.unrealizedPnl)}
            </span>
          </div>
        )}
      </div>

      {/* Detailed Stats Grid */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChartIcon className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold">Trading Statistics</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Win/Loss */}
          <StatRow label="Winning Trades" value={stats.winningTrades.toString()} />
          <StatRow label="Losing Trades" value={stats.losingTrades.toString()} />

          {/* Averages */}
          <StatRow
            label="Avg Win"
            value={formatCurrency(stats.avgWin)}
            color="success"
          />
          <StatRow
            label="Avg Loss"
            value={formatCurrency(stats.avgLoss)}
            color="error"
          />

          {/* Ratios */}
          <StatRow
            label="Win/Loss Ratio"
            value={stats.avgWinLossRatio >= 999 ? '∞' : stats.avgWinLossRatio.toFixed(2)}
          />
          <StatRow
            label="Profit Factor"
            value={stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)}
          />

          {/* Best/Worst */}
          <StatRow
            label="Best Trade"
            value={formatCurrency(stats.bestTrade)}
            color="success"
          />
          <StatRow
            label="Worst Trade"
            value={formatCurrency(stats.worstTrade)}
            color="error"
          />

          {/* Expectancy */}
          <StatRow
            label="Expectancy"
            value={formatCurrency(stats.expectancy)}
            color={stats.expectancy >= 0 ? 'success' : 'error'}
          />
          <StatRow
            label="Total P&L"
            value={formatCurrency(stats.totalPnl)}
            color={stats.totalPnl >= 0 ? 'success' : 'error'}
          />
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldIcon className="w-4 h-4 text-error" />
          <span className="text-sm font-semibold">Risk Metrics</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <StatRow
            label="Max Drawdown"
            value={formatCurrency(stats.maxDrawdown)}
            color="error"
          />
          <StatRow
            label="Max Drawdown %"
            value={`${stats.maxDrawdownPct.toFixed(2)}%`}
            color="error"
          />
          <StatRow
            label="Sharpe Ratio"
            value={stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : 'N/A'}
            color={stats.sharpeRatio && stats.sharpeRatio > 0 ? 'success' : 'foreground'}
          />
          <StatRow
            label="Current Streak"
            value={formatStreak(stats.currentStreak)}
            color={stats.currentStreak > 0 ? 'success' : stats.currentStreak < 0 ? 'error' : 'foreground'}
          />
          <StatRow label="Longest Win Streak" value={`${stats.longestWinStreak} wins`} />
          <StatRow label="Longest Loss Streak" value={`${stats.longestLossStreak} losses`} />
        </div>
      </div>

      {/* Time Statistics */}
      {stats.totalTrades > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Time Statistics</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StatRow
              label="Avg Trade Duration"
              value={formatDuration(stats.avgTradeDuration)}
            />
            <StatRow
              label="Trades Per Day"
              value={stats.tradesPerDay.toFixed(1)}
            />
            <StatRow
              label="First Trade"
              value={stats.firstTradeAt ? formatDate(stats.firstTradeAt) : 'N/A'}
            />
            <StatRow
              label="Last Trade"
              value={stats.lastTradeAt ? formatDate(stats.lastTradeAt) : 'N/A'}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalTrades === 0 && (
        <div className="bg-card rounded-xl border border-border p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-background mx-auto mb-3 flex items-center justify-center">
            <ChartIcon className="w-6 h-6 text-foreground-subtle" />
          </div>
          <h4 className="text-sm font-medium text-foreground-muted mb-1">No Trades Yet</h4>
          <p className="text-xs text-foreground-subtle">
            Statistics will appear once your agent starts trading
          </p>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'success' | 'error' | 'foreground' | 'warning';
}) {
  const colorClasses = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    foreground: 'text-foreground',
  };

  return (
    <div className="bg-background rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-[10px] text-foreground-subtle uppercase">{label}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color = 'foreground',
}: {
  label: string;
  value: string;
  color?: 'success' | 'error' | 'foreground' | 'warning';
}) {
  const colorClasses = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    foreground: 'text-foreground',
  };

  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-foreground-muted">{label}</span>
      <span className={`font-medium ${colorClasses[color]}`}>{value}</span>
    </div>
  );
}

// Helper Functions
function formatCurrency(value: number): string {
  if (value >= 0) {
    return `$${value.toFixed(2)}`;
  }
  return `-$${Math.abs(value).toFixed(2)}`;
}

function formatStreak(streak: number): string {
  if (streak === 0) return '0';
  if (streak > 0) return `${streak}W`;
  return `${Math.abs(streak)}L`;
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Icons
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M18 9l-5 5-4-4-3 3" />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
