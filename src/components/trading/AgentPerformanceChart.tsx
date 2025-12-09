'use client';

import { useState, useEffect, useMemo } from 'react';

interface AgentPerformanceChartProps {
  agentId: string;
  initialBalance: number;
  currentBalance: number;
}

interface DataPoint {
  timestamp: Date;
  value: number;
}

// Generate mock performance data based on current balance
function generatePerformanceData(initialBalance: number, currentBalance: number): DataPoint[] {
  const points: DataPoint[] = [];
  const now = new Date();
  const hoursBack = 8; // Show 8 hours of data

  // Calculate a smooth path from initial to current
  const totalChange = currentBalance - initialBalance;

  for (let i = 0; i <= 48; i++) {
    const timestamp = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000) + (i * (hoursBack * 60 * 60 * 1000) / 48));

    // Create a realistic looking curve with some variation
    const progress = i / 48;
    const baseValue = initialBalance + (totalChange * progress);

    // Add small random variations (less at start and end)
    const variation = Math.sin(i * 0.5) * (initialBalance * 0.001) * (1 - Math.abs(progress - 0.5) * 2);

    points.push({
      timestamp,
      value: baseValue + variation,
    });
  }

  return points;
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

  // Calculate chart dimensions and scaling
  const chartWidth = 900;
  const chartHeight = 400;
  const padding = { top: 20, right: 60, bottom: 40, left: 60 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate min/max for scaling
  const values = performanceData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Add some padding to the range
  const paddedMin = minValue - valueRange * 0.1;
  const paddedMax = maxValue + valueRange * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Scale functions
  const xScale = (index: number) => padding.left + (index / (performanceData.length - 1)) * innerWidth;
  const yScale = (value: number) => padding.top + innerHeight - ((value - paddedMin) / paddedRange) * innerHeight;

  // Generate path
  const pathD = performanceData.map((point, i) => {
    const x = xScale(i);
    const y = yScale(point.value);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path (for gradient fill)
  const areaD = pathD + ` L ${xScale(performanceData.length - 1)} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

  // Y-axis labels
  const yLabels = [paddedMax, paddedMin + paddedRange * 0.75, paddedMin + paddedRange * 0.5, paddedMin + paddedRange * 0.25, paddedMin];

  // X-axis labels (time)
  const xLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    const step = Math.floor(performanceData.length / 6);
    for (let i = 0; i < performanceData.length; i += step) {
      const point = performanceData[i];
      labels.push({
        label: point.timestamp.toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        index: i
      });
    }
    return labels;
  }, [performanceData]);

  // Suppress unused warning
  void agentId;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chart Controls */}
      <div className="flex items-center justify-between px-4 py-2">
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
      <div className="flex-1 px-2">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + (i / (yLabels.length - 1)) * innerHeight}
              x2={chartWidth - padding.right}
              y2={padding.top + (i / (yLabels.length - 1)) * innerHeight}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Vertical grid lines */}
          {xLabels.map((label, i) => (
            <line
              key={i}
              x1={xScale(label.index)}
              y1={padding.top}
              x2={xScale(label.index)}
              y2={padding.top + innerHeight}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaD}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {yLabels.map((value, i) => (
            <text
              key={i}
              x={padding.left - 10}
              y={padding.top + (i / (yLabels.length - 1)) * innerHeight}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-foreground-muted text-[10px]"
            >
              ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={i}
              x={xScale(label.index)}
              y={chartHeight - 10}
              textAnchor="middle"
              className="fill-foreground-muted text-[10px]"
            >
              {label.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
