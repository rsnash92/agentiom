'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AgentSwitcherBar, TerminalPanel, SimpleAgentSettings, AgentPerformanceChart, AgentInfoCard } from '@/components/trading';
import { useAgent, useAgents } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgentSetupChecklist } from '@/components/agent';

function AgentTradingPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Support both path param (/agents/[id]) and query param (?agentId=)
  const pathId = params.id as string;
  const queryId = searchParams.get('agentId');
  const agentId = pathId || queryId || null;

  // Fetch all agents for the switcher bar
  const { agents: allAgents } = useAgents();

  // Fetch the current agent's data
  const { agent, isLoading: agentLoading, error: agentError, toggleStatus } = useAgent(agentId);

  const [selectedAgentId, setSelectedAgentId] = useState<string>(agentId || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSetupChecklist, setShowSetupChecklist] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Update selected agent ID when agent changes
  useEffect(() => {
    if (agentId) {
      setSelectedAgentId(agentId);
    }
  }, [agentId]);

  // Show setup checklist for new/paused agents
  useEffect(() => {
    if (agent && agent.status === 'paused' && !checklistDismissed) {
      setShowSetupChecklist(true);
    }
  }, [agent, checklistDismissed]);

  // Listen for fullscreen changes
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Truncate wallet address helper
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Transform agents for switcher bar
  const agentsForSwitcher = allAgents.map(a => ({
    id: a.id,
    name: a.name,
    address: truncateAddress(a.walletAddress),
    totalBalance: parseFloat(a.demoBalance || '0'),
    unrealizedPnl: 0,
    status: a.status as 'active' | 'paused',
  }));

  // Loading state
  if (agentLoading) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-muted">Loading agent...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (agentError || !agent) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-4">
            <ErrorIcon className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Agent Not Found</h2>
          <p className="text-foreground-muted text-sm mb-6">{agentError || 'The agent you are looking for does not exist.'}</p>
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90"
          >
            <BackIcon className="w-4 h-4" />
            Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  // Handle checklist close
  const handleChecklistClose = () => {
    setShowSetupChecklist(false);
    setChecklistDismissed(true);
  };

  // Handle agent activation from checklist
  const handleActivateFromChecklist = async () => {
    await toggleStatus();
    setShowSetupChecklist(false);
    setChecklistDismissed(true);
  };

  // Placeholder goals from agent strategy
  const agentGoals = agent ? [
    {
      id: '1',
      description: `Execute ${agent.strategy.split(' ')[0]} Strategy`,
      isActive: agent.status === 'active',
    },
  ] : [];

  // Get agent balance
  const agentBalance = parseFloat(agent.demoBalance || '5000');

  return (
    <div className="h-[calc(100vh-56px)] flex bg-background overflow-hidden p-1 panel-gap">
      {/* Agent Setup Checklist Modal */}
      {showSetupChecklist && agent && (
        <AgentSetupChecklist
          agentId={agent.id}
          agentName={agent.name}
          walletAddress={agent.walletAddress}
          goals={agentGoals}
          onClose={handleChecklistClose}
          onActivate={handleActivateFromChecklist}
        />
      )}

      {/* Left Section - Chart + Terminal */}
      <div className="flex-1 flex flex-col panel-gap min-w-0">
        {/* Top row: Agent Info Card + Agent Switcher */}
        <div className="flex panel-gap">
          {/* Agent Info Card */}
          <AgentInfoCard
            agentId={agent.id}
            agentName={agent.name}
            balance={agentBalance}
            status={agent.status as 'active' | 'paused'}
            isDemo={agent.isDemo}
            onToggleStatus={toggleStatus}
          />

          {/* Agent Switcher (if multiple agents) */}
          {allAgents.length > 1 && (
            <div className="flex-1">
              <AgentSwitcherBar
                agents={agentsForSwitcher}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
              />
            </div>
          )}
        </div>

        {/* Performance Chart Panel */}
        <div
          ref={chartContainerRef}
          className={`panel flex-1 min-h-[300px] ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4 rounded-none' : ''}`}
        >
          <AgentPerformanceChart
            agentId={agent.id}
            initialBalance={5000}
            currentBalance={agentBalance}
          />
        </div>

        {/* Terminal Panel - 3 Tabs: Order History, Model Chat, Positions */}
        {!isFullscreen && (
          <div className="panel h-[280px] overflow-hidden">
            <TerminalPanel
              agentId={agent.id}
              agentName={agent.name}
            />
          </div>
        )}
      </div>

      {/* Right Panel - Simple Agent Settings */}
      <div className="w-[320px] panel flex flex-col overflow-hidden">
        <SimpleAgentSettings agentId={agent.id} />
      </div>
    </div>
  );
}

export default function AgentTradingPage() {
  return (
    <ProtectedRoute>
      <AgentTradingPageContent />
    </ProtectedRoute>
  );
}

// Icons
function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}
