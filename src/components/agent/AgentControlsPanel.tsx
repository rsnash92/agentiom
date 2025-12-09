'use client';

import { useState, useEffect } from 'react';
import { CollapsibleSection, ActionButton, InfoRow } from '@/components/ui/trading-form';

interface AgentLog {
  id: string;
  logType: 'thinking' | 'decision' | 'execution' | 'error' | 'policy';
  content: string;
  symbol?: string;
  confidence?: number;
  createdAt: string;
}

interface AgentControlsPanelProps {
  agentId: string;
  agentName: string;
  status: 'active' | 'paused' | 'stopped';
  onToggleStatus: () => Promise<unknown>;
  onExecuteOnce: () => Promise<unknown>;
  fetchStatus: () => Promise<{
    status: string;
    schedulerRunning: boolean;
    executionInterval: number;
    lastExecutionAt: string | null;
    recentLogs: AgentLog[];
  } | null>;
}

export function AgentControlsPanel({
  agentId,
  agentName,
  status,
  onToggleStatus,
  onExecuteOnce,
  fetchStatus,
}: AgentControlsPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [lastExecution, setLastExecution] = useState<string | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  // Fetch status on mount and periodically
  useEffect(() => {
    const loadStatus = async () => {
      const data = await fetchStatus();
      if (data) {
        setLogs(data.recentLogs || []);
        setLastExecution(data.lastExecutionAt);
        setSchedulerRunning(data.schedulerRunning);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleStatus();
      // Refresh status
      const data = await fetchStatus();
      if (data) {
        setSchedulerRunning(data.schedulerRunning);
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecuteOnce();
      // Refresh logs after execution
      const data = await fetchStatus();
      if (data) {
        setLogs(data.recentLogs || []);
        setLastExecution(data.lastExecutionAt);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  const logTypeColors: Record<string, string> = {
    thinking: 'text-blue-400',
    decision: 'text-primary',
    execution: 'text-success',
    error: 'text-error',
    policy: 'text-warning',
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Agent Status */}
        <CollapsibleSection title="Agent Status" defaultOpen>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg border border-border/60">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  status === 'active' ? 'bg-success animate-pulse' : 'bg-foreground-muted'
                }`} />
                <span className="text-xs font-medium">
                  {status === 'active' ? 'Running' : 'Paused'}
                </span>
              </div>
              {schedulerRunning && (
                <span className="text-[10px] text-success">Scheduler Active</span>
              )}
            </div>

            <InfoRow label="Last Execution" value={formatTimeAgo(lastExecution)} />

            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                variant={status === 'active' ? 'error' : 'success'}
                onClick={handleToggle}
                disabled={isToggling}
              >
                {isToggling ? 'Working...' : status === 'active' ? 'Stop Agent' : 'Start Agent'}
              </ActionButton>
              <ActionButton
                variant="outline"
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? 'Running...' : 'Run Once'}
              </ActionButton>
            </div>
          </div>
        </CollapsibleSection>

        {/* Recent Activity */}
        <CollapsibleSection title="Recent Activity" defaultOpen>
          {logs.length === 0 ? (
            <div className="text-center py-6">
              <ActivityIcon className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
              <p className="text-[10px] text-foreground-muted">No activity yet</p>
              <p className="text-[10px] text-foreground-subtle">Start the agent to see logs</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 bg-background-secondary rounded-lg border border-border/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-medium uppercase ${logTypeColors[log.logType] || 'text-foreground-muted'}`}>
                      {log.logType}
                    </span>
                    <span className="text-[10px] text-foreground-subtle">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-[10px] text-foreground-muted line-clamp-2">
                    {log.content}
                  </p>
                  {log.symbol && (
                    <span className="text-[9px] text-primary">{log.symbol}</span>
                  )}
                  {log.confidence && (
                    <span className="text-[9px] text-foreground-subtle ml-2">
                      {log.confidence}% confidence
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
