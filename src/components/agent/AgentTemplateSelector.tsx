'use client';

import { useState, useMemo } from 'react';
import {
  AGENT_TEMPLATES,
  searchTemplates,
  type AgentTemplate,
} from '@/config/agent-templates';

type FilterType = 'all' | 'official' | 'user';

interface AgentTemplateSelectorProps {
  onSelect: (template: AgentTemplate) => void;
  onSkip: () => void;
}

export function AgentTemplateSelector({
  onSelect,
  onSkip,
}: AgentTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter templates based on search and filter type
  const filteredTemplates = useMemo(() => {
    let templates = searchQuery
      ? searchTemplates(searchQuery)
      : AGENT_TEMPLATES;

    if (filter === 'official') {
      templates = templates.filter(t => t.isOfficial);
    } else if (filter === 'user') {
      templates = templates.filter(t => !t.isOfficial);
    }

    return templates;
  }, [searchQuery, filter]);

  // Group templates by category
  const officialTemplates = filteredTemplates.filter(t => t.isOfficial);
  const userTemplates = filteredTemplates.filter(t => !t.isOfficial);

  const handleViewDetails = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setShowDetails(true);
  };

  const handleSelectTemplate = (template: AgentTemplate) => {
    onSelect(template);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <TemplateIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Choose Agent Template</h1>
              <p className="text-sm text-foreground-muted">Start with a pre-configured template</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="p-4 bg-background-secondary border border-border rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-1">Get Started Quickly</h3>
              <p className="text-xs text-foreground-muted">
                Select one of the templates below to create your agent with pre-configured goals and triggers.
                You can fully customize the agent once it&apos;s created to match your trading strategy.
              </p>
            </div>
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground border border-border rounded-lg hover:bg-background-tertiary transition-colors"
            >
              Skip & Create Custom
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-background-secondary border border-border rounded-lg p-1">
            {(['all', 'official', 'user'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === filterType
                    ? 'bg-primary text-black'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {filterType === 'official' ? 'Agentiom' : filterType}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-foreground-muted mt-2">
          {filteredTemplates.length} templates found
        </p>
      </div>

      {/* Template Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
        {/* Official Templates */}
        {officialTemplates.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <AgentiomIcon className="w-3 h-3 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Agentiom Templates</h2>
              <span className="px-2 py-0.5 bg-background-tertiary rounded text-xs text-foreground-muted">
                {officialTemplates.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {officialTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onDetails={() => handleViewDetails(template)}
                  onSelect={() => handleSelectTemplate(template)}
                />
              ))}
            </div>
          </div>
        )}

        {/* User Templates */}
        {userTemplates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-foreground-muted/20 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-foreground-muted" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Your Templates</h2>
              <span className="px-2 py-0.5 bg-background-tertiary rounded text-xs text-foreground-muted">
                {userTemplates.length}
              </span>
            </div>

            {userTemplates.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-border rounded-xl text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-background-tertiary flex items-center justify-center">
                  <TemplateIcon className="w-6 h-6 text-foreground-muted" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Your Templates Will Appear Here</h3>
                <p className="text-xs text-foreground-muted">
                  Create a custom agent or clone one of the Agentiom templates and save it as your own.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onDetails={() => handleViewDetails(template)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-foreground-muted">No templates found matching your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-sm text-primary hover:text-primary/80"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Template Details Modal */}
      {showDetails && selectedTemplate && (
        <TemplateDetailsModal
          template={selectedTemplate}
          onClose={() => setShowDetails(false)}
          onSelect={() => {
            handleSelectTemplate(selectedTemplate);
            setShowDetails(false);
          }}
        />
      )}
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onDetails,
  onSelect,
}: {
  template: AgentTemplate;
  onDetails: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="bg-background-secondary border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            template.isOfficial
              ? 'bg-primary/20 text-primary'
              : 'bg-foreground-muted/20 text-foreground-muted'
          }`}>
            {template.isOfficial ? 'Agentiom' : 'User'}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            template.difficulty === 'beginner'
              ? 'bg-success/20 text-success'
              : template.difficulty === 'intermediate'
              ? 'bg-warning/20 text-warning'
              : 'bg-error/20 text-error'
          }`}>
            {template.difficulty}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-2">{template.name}</h3>
        <p className="text-xs text-foreground-muted line-clamp-3">{template.description}</p>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg flex-1">
            <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
              <TaskIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-foreground-muted">Tasks</p>
              <p className="text-sm font-semibold text-foreground">{template.stats.tasks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg flex-1">
            <div className="w-6 h-6 rounded-md bg-warning/20 flex items-center justify-center">
              <TriggerIcon className="w-3.5 h-3.5 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-foreground-muted">Triggers</p>
              <p className="text-sm font-semibold text-foreground">{template.stats.triggers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onDetails}
          className="flex-1 py-2 bg-background-tertiary text-foreground-muted rounded-lg text-xs font-medium hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
        >
          <EyeIcon className="w-3.5 h-3.5" />
          Details
        </button>
        <button
          onClick={onSelect}
          className="flex-1 py-2 bg-primary text-black rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
        >
          Select
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Template Details Modal
function TemplateDetailsModal({
  template,
  onClose,
  onSelect,
}: {
  template: AgentTemplate;
  onClose: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                template.isOfficial
                  ? 'bg-primary/20 text-primary'
                  : 'bg-foreground-muted/20 text-foreground-muted'
              }`}>
                {template.isOfficial ? 'Agentiom' : 'User'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">{template.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
            <p className="text-sm text-foreground-muted">{template.description}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-background rounded-md text-xs text-foreground-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Strategy Details */}
          <div className="p-3 bg-background rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-2">Trading Strategy</h3>
            <p className="text-xs text-foreground-muted">{template.config.personality}</p>
          </div>

          {/* Risk Settings */}
          <div className="p-3 bg-background rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-2">Risk Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-foreground-muted">Max Leverage</p>
                <p className="text-sm font-medium text-foreground">{template.config.policies.maxLeverage}x</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground-muted">Max Position</p>
                <p className="text-sm font-medium text-foreground">${template.config.policies.maxPositionSizeUsd}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground-muted">Max Drawdown</p>
                <p className="text-sm font-medium text-foreground">{template.config.policies.maxDrawdownPct}%</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground-muted">Trading Pairs</p>
                <p className="text-sm font-medium text-foreground">{template.config.approvedPairs.join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Pre-configured Goals</h3>
            <div className="space-y-2">
              {template.goals.map((goal, index) => (
                <div key={index} className="p-3 bg-background rounded-lg">
                  <p className="text-sm text-foreground mb-1">{goal.description}</p>
                  {goal.conditions && (
                    <p className="text-xs text-foreground-muted">
                      <span className="text-primary">Conditions:</span> {goal.conditions}
                    </p>
                  )}
                  {goal.actions && (
                    <p className="text-xs text-foreground-muted">
                      <span className="text-success">Actions:</span> {goal.actions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onSelect}
            className="w-full py-3 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            Use This Template
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function AgentiomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function TriggerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
