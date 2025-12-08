'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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

interface AgentTasksPanelProps {
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

export function AgentTasksPanel({
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
}: AgentTasksPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const filteredTasks = tasks.filter((task) =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BotIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Task Management</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  agentStatus === 'active' ? 'bg-success' :
                  agentStatus === 'paused' ? 'bg-warning' : 'bg-error'
                }`} />
                {activeTasks} active · {totalTasks} total
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEditTemplate}
              className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors"
              title="Edit Template"
            >
              <TemplateIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onNewTask}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-black text-xs font-semibold rounded-md hover:bg-primary-hover transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={onActivateAll}
            className="text-xs"
          >
            <PlayIcon className="w-3.5 h-3.5 mr-1" />
            Activate All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onPauseAll}
            className="text-xs"
          >
            <PauseIcon className="w-3.5 h-3.5 mr-1" />
            Pause All
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
            <TasksIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No tasks found</p>
            <p className="text-xs text-foreground-subtle mt-1">Create a new task to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                expanded={expandedTask === task.id}
                onToggleExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                onToggleStatus={() => onTaskToggle?.(task.id)}
              />
            ))}
          </div>
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
  const statusColors = {
    active: 'bg-success',
    paused: 'bg-warning',
    completed: 'bg-primary',
    failed: 'bg-error',
  };

  return (
    <div className="hover:bg-card/50 transition-colors">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex-shrink-0 pt-0.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <StrategyIcon className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{task.name}</h4>
            <Badge
              variant={task.status === 'active' ? 'success' : task.status === 'paused' ? 'warning' : 'default'}
              size="sm"
            >
              {task.status}
            </Badge>
            <span className="text-[10px] text-foreground-subtle">Priority {task.priority}</span>
          </div>
          <p className="text-xs text-foreground-muted line-clamp-2 mb-2">{task.description}</p>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="text-foreground-subtle">Total Runs</span>
              <span className="ml-1.5 font-mono text-foreground">{task.totalRuns}</span>
            </div>
            <div>
              <span className="text-foreground-subtle">Success Rate</span>
              <span className={`ml-1.5 font-mono ${task.successRate >= 50 ? 'text-success' : 'text-error'}`}>
                {task.successRate}%
              </span>
            </div>
            <div>
              <span className="text-foreground-subtle">Avg Credits</span>
              <span className="ml-1.5 font-mono text-foreground">{task.avgCredits}</span>
            </div>
          </div>

          <div className="text-[10px] text-foreground-subtle mt-2">
            Updated {task.updatedAt}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus();
          }}
          className="flex-shrink-0"
        >
          <ChevronIcon className={`w-5 h-5 text-foreground-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded Steps */}
      {expanded && (
        <div className="px-4 pb-4 pl-16">
          <div className="text-xs text-foreground-subtle mb-2 font-medium">Execution Steps:</div>
          <div className="space-y-1.5">
            {task.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <span className="text-primary font-mono">STEP {index + 1}:</span>
                <span className="text-foreground-muted">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
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
function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
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
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function StrategyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}
