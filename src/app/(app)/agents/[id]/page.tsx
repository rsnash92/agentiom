'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TVChart, TIMEFRAMES, AgentSwitcherBar, MarketSelector, TerminalPanel, SimpleAgentSettings } from '@/components/trading';
import { useMarketData, useAgent, useAgents } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgentSetupChecklist } from '@/components/agent';

// Format large numbers
function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Format funding countdown
function getFundingCountdown(): string {
  const now = new Date();
  const hours = now.getUTCHours();
  const fundingHours = [0, 8, 16];
  let nextFunding = fundingHours.find(h => h > hours) ?? 24;
  if (nextFunding === 24) nextFunding = 0;

  const hoursUntil = nextFunding > hours ? nextFunding - hours : (24 - hours + nextFunding);
  const mins = 60 - now.getUTCMinutes();
  const secs = 60 - now.getUTCSeconds();

  return `${String(hoursUntil - 1).padStart(2, '0')}:${String(mins - 1).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

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
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [showSetupChecklist, setShowSetupChecklist] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Update selected coin based on agent's approved pairs
  useEffect(() => {
    if (agent?.policies?.approvedPairs && agent.policies.approvedPairs.length > 0) {
      const firstPair = agent.policies.approvedPairs[0];
      const coin = firstPair.replace('-PERP', '').split('/')[0];
      setSelectedCoin(coin);
    }
  }, [agent]);

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

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && chartContainerRef.current) {
      chartContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch live market data
  const { data: marketData } = useMarketData({
    coin: selectedCoin,
    refreshInterval: 5000,
    enableWebSocket: true,
  });

  // Derived values
  const currentPrice = marketData?.markPx ?? 0;
  const priceChange = marketData?.priceChangePct24h ?? 0;
  const volume24h = marketData?.volume24h ? formatVolume(marketData.volume24h) : '--';
  const fundingRate = marketData?.funding ?? 0;
  const fundingCountdown = getFundingCountdown();

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
    totalBalance: 0,
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
        {/* Top Agent Switcher Bar */}
        <AgentSwitcherBar
          agents={agentsForSwitcher}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
        />

        {/* Price Bar Panel */}
        <div className="panel flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-6">
            {/* Symbol Selector */}
            <MarketSelector
              selectedCoin={selectedCoin}
              onSelectCoin={setSelectedCoin}
              isOpen={showCoinDropdown}
              onClose={() => setShowCoinDropdown(false)}
              onOpen={() => setShowCoinDropdown(true)}
            />

            {/* Quick Stats - Live Data */}
            <div className="hidden lg:flex items-center gap-6 text-xs">
              <div>
                <span className="text-foreground-subtle">Price</span>
                <span className="ml-2 font-mono text-foreground font-semibold">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-foreground-subtle">24h</span>
                <span className={`ml-2 font-mono ${priceChange >= 0 ? 'text-success' : 'text-error'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-foreground-subtle">Vol</span>
                <span className="ml-2 font-mono text-foreground">{volume24h}</span>
              </div>
              <div>
                <span className="text-foreground-subtle">Fund</span>
                <span className={`ml-2 font-mono ${fundingRate >= 0 ? 'text-success' : 'text-error'}`}>
                  {fundingRate >= 0 ? '+' : ''}{fundingRate.toFixed(4)}%
                </span>
                <span className="ml-1 text-foreground-subtle">{fundingCountdown}</span>
              </div>
            </div>
          </div>

          {/* Right side - Timeframe Selector */}
          <div className="flex items-center gap-0.5 bg-background rounded p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  selectedTimeframe === tf.value
                    ? 'bg-background-secondary text-foreground'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Panel */}
        <div
          ref={chartContainerRef}
          className={`panel flex-1 p-2 min-h-[300px] ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4 rounded-none' : ''}`}
        >
          <TVChart
            symbol={`${selectedCoin}-PERP`}
            currentPrice={currentPrice}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
            onFullscreenToggle={toggleFullscreen}
            isFullscreen={isFullscreen}
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
