'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface AgentTask {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  priority: number;
  steps: string[];
  totalRuns: number;
  successRate: number;
  avgCredits: number;
  updatedAt: string;
}

interface AgentRightPanelProps {
  agentName: string;
  agentStatus: 'active' | 'paused' | 'stopped';
  tasks: AgentTask[];
  totalTasks: number;
  activeTasks: number;
  onActivateAll?: () => void;
  onPauseAll?: () => void;
  onTaskToggle?: (taskId: string) => void;
  onNewTask?: () => void;
  onEditTemplate?: () => void;
}

export function AgentRightPanel({
  agentName,
  agentStatus,
  tasks,
  totalTasks,
  activeTasks,
  onActivateAll,
  onPauseAll,
  onTaskToggle,
  onNewTask,
  onEditTemplate,
}: AgentRightPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const filteredTasks = tasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
              <TargetIcon className="w-5 h-5 text-foreground-muted" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Task Management</h3>
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    agentStatus === 'active'
                      ? 'bg-success'
                      : agentStatus === 'paused'
                        ? 'bg-warning'
                        : 'bg-error'
                  }`}
                />
                {activeTasks} active · {totalTasks} total
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEditTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-md text-xs font-medium text-foreground-muted hover:text-foreground hover:border-border-hover transition-colors"
            >
              <TemplateIcon className="w-3.5 h-3.5" />
              Template
            </button>
            <button
              onClick={onNewTask}
              className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 text-white text-xs font-semibold rounded-md hover:bg-pink-600 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Search with icons */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <ListIcon className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <RefreshIcon className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors">
            <FilterIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="success" size="sm" onClick={onActivateAll} className="text-xs">
            <PlayIcon className="w-3.5 h-3.5 mr-1.5" />
            Activate All
          </Button>
          <Button variant="secondary" size="sm" onClick={onPauseAll} className="text-xs">
            <PauseIcon className="w-3.5 h-3.5 mr-1.5" />
            Pause All
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
            <TasksEmptyIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No tasks found</p>
            <p className="text-xs text-foreground-subtle mt-1">Create a new task to get started</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTask === task.id}
              onToggleExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              onToggleStatus={() => onTaskToggle?.(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: AgentTask;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleStatus: () => void;
}

function TaskCard({ task, expanded, onToggleExpand, onToggleStatus }: TaskCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={onToggleExpand}>
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0">
            <TrendUpIcon className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{task.name}</h4>
              <ChevronIcon
                className={`w-5 h-5 text-foreground-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 ${
                  task.status === 'active'
                    ? 'bg-success/20 text-success'
                    : task.status === 'paused'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-error/20 text-error'
                }`}
              >
                <PauseIcon className="w-2.5 h-2.5" />
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
              <span className="text-[11px] text-foreground-subtle">Priority {task.priority}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">
            {task.description.split(':')[0]}:
          </p>
          <p className="text-xs text-foreground font-medium">
            STEP 1: {task.steps[0]?.split(' - ')[0] || 'VALIDATE CONDITIONS'}...
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{task.totalRuns}</div>
            <div className="text-[10px] text-foreground-subtle uppercase">Total Runs</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${task.successRate > 0 ? 'text-success' : 'text-warning'}`}>
              {task.successRate}%
            </div>
            <div className="text-[10px] text-foreground-subtle uppercase">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{task.avgCredits}</div>
            <div className="text-[10px] text-foreground-subtle uppercase">Avg Credits</div>
          </div>
        </div>

        {/* Updated timestamp */}
        <div className="pt-3 border-t border-border">
          <span className="text-[11px] text-foreground-subtle">Updated {task.updatedAt}</span>
        </div>
      </div>

      {/* Expanded Steps */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="text-xs text-foreground-subtle mb-2 font-medium">Execution Steps:</div>
          <div className="space-y-1.5">
            {task.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <span className="text-primary font-mono font-semibold">STEP {index + 1}:</span>
                <span className="text-foreground-muted">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="secondary" className="text-xs">
              Edit Task
            </Button>
            <Button size="sm" variant="ghost" className="text-xs text-error hover:text-error">
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function TasksEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}
