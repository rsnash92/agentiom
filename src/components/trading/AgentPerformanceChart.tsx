'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface AgentPerformanceChartProps {
  agentId: string;
  initialBalance?: number;
  currentBalance?: number;
}

interface DataPoint {
  timestamp: number;
  value: number;
}

interface PerformanceData {
  initialBalance: number;
  currentBalance: number;
  unrealizedPnl: number;
  totalPnl: number;
  pnlPct: number;
  dataPoints: DataPoint[];
}

// Custom tooltip component
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DataPoint }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const date = new Date(data.timestamp);

  return (
    <div className="bg-background-secondary border border-border rounded px-3 py-2 text-xs">
      <div className="text-foreground-muted">
        {date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
      <div className="text-foreground font-medium">
        Value: ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export function AgentPerformanceChart({
  agentId,
}: AgentPerformanceChartProps) {
  const { getAccessToken } = usePrivy();
  const [timeRange, setTimeRange] = useState<'ALL' | '72H'>('ALL');
  const [displayMode, setDisplayMode] = useState<'$' | '%'>('$');
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch performance data
  const fetchPerformance = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/performance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data);
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, getAccessToken]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchPerformance]);

  // Generate chart data points (fill in gaps for smooth line)
  const chartData = performanceData?.dataPoints || [];

  // Calculate domain for Y axis
  const values = chartData.map(d => d.value);
  const minValue = values.length > 0 ? Math.min(...values) : 4900;
  const maxValue = values.length > 0 ? Math.max(...values) : 5100;
  const range = maxValue - minValue || 100;
  const yMin = Math.floor(minValue - range * 0.1);
  const yMax = Math.ceil(maxValue + range * 0.1);

  // Format X axis ticks
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Format Y axis ticks
  const formatYAxis = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  // Determine line color based on P&L
  const pnlColor = (performanceData?.totalPnl || 0) >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';

  // Suppress unused warnings
  void timeRange;
  void displayMode;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart Controls */}
      <div className="flex items-center justify-between px-3 py-1.5">
        {/* Display Mode Toggle */}
        <div className="flex items-center gap-1 bg-background-secondary rounded p-0.5">
          <button
            onClick={() => setDisplayMode('$')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              displayMode === '$'
                ? 'bg-background text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            $
          </button>
          <button
            onClick={() => setDisplayMode('%')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              displayMode === '%'
                ? 'bg-background text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            %
          </button>
        </div>

        {/* Time Range Toggle */}
        <div className="flex items-center gap-1 bg-background-secondary rounded p-0.5">
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              timeRange === 'ALL'
                ? 'bg-background text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setTimeRange('72H')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              timeRange === '72H'
                ? 'bg-background text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            72H
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pnlColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={pnlColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="currentColor"
              strokeOpacity={0.1}
              vertical={true}
              horizontal={true}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              tick={{ fill: 'rgb(156, 163, 175)', fontSize: 11 }}
              tickLine={{ stroke: 'rgb(156, 163, 175)', strokeOpacity: 0.3 }}
              axisLine={{ stroke: 'rgb(156, 163, 175)', strokeOpacity: 0.3 }}
              minTickGap={80}
            />

            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={formatYAxis}
              tick={{ fill: 'rgb(156, 163, 175)', fontSize: 11 }}
              tickLine={{ stroke: 'rgb(156, 163, 175)', strokeOpacity: 0.3 }}
              axisLine={{ stroke: 'rgb(156, 163, 175)', strokeOpacity: 0.3 }}
              width={70}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="value"
              stroke={pnlColor}
              strokeWidth={2}
              fill="url(#colorValue)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
