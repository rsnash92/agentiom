'use client';

import { useState, useMemo } from 'react';
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
  initialBalance: number;
  currentBalance: number;
}

interface DataPoint {
  timestamp: number;
  value: number;
  label: string;
}

// Generate realistic performance data - mostly flat with small variations
function generatePerformanceData(initialBalance: number, currentBalance: number): DataPoint[] {
  const points: DataPoint[] = [];
  const now = new Date();
  const hoursBack = 8;
  const numPoints = 100;

  // For a new agent, the line should be mostly flat
  const totalChange = currentBalance - initialBalance;

  for (let i = 0; i <= numPoints; i++) {
    const timestamp = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000) + (i * (hoursBack * 60 * 60 * 1000) / numPoints));

    // Progress from 0 to 1
    const progress = i / numPoints;

    // Base value progresses linearly from initial to current
    const baseValue = initialBalance + (totalChange * progress);

    // Add very small random noise (0.01% max) to make it look realistic
    const noise = (Math.random() - 0.5) * initialBalance * 0.0002;

    points.push({
      timestamp: timestamp.getTime(),
      value: baseValue + noise,
      label: timestamp.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
    });
  }

  return points;
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
  initialBalance = 5000,
  currentBalance = 5000
}: AgentPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<'ALL' | '72H'>('ALL');
  const [displayMode, setDisplayMode] = useState<'$' | '%'>('$');

  // Generate performance data
  const performanceData = useMemo(() =>
    generatePerformanceData(initialBalance, currentBalance),
    [initialBalance, currentBalance]
  );

  // Calculate domain for Y axis - tight range around the data
  const values = performanceData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 10;
  const yMin = Math.floor(minValue - range * 0.2);
  const yMax = Math.ceil(maxValue + range * 0.2);

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

  // Suppress unused warning
  void agentId;

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
            data={performanceData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
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
              stroke="rgb(59, 130, 246)"
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
