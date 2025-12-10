'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { BuyCreditsModal } from '@/components/credits';

interface AgentSetupChecklistProps {
  agentId: string;
  agentName: string;
  walletAddress: string;
  goals: Array<{ id: string; description: string; isActive: boolean }>;
  onClose: () => void;
  onActivate: () => void;
}

interface WalletBalances {
  hyperliquidUsdc: number;
  arbitrumEth: number;
  arbitrumUsdc: number;
}

interface ChecklistRequirements {
  credits: { current: number; required: number; met: boolean };
  wallet: { balances: WalletBalances; minUsdc: number; minEth: number; met: boolean };
  goals: { active: number; required: number; met: boolean };
}

export function AgentSetupChecklist({
  agentId,
  agentName,
  walletAddress,
  goals,
  onClose,
  onActivate,
}: AgentSetupChecklistProps) {
  const { getAccessToken } = usePrivy();
  const [expandedSection, setExpandedSection] = useState<string | null>('credits');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [requirements, setRequirements] = useState<ChecklistRequirements>({
    credits: { current: 0, required: 1000, met: false },
    wallet: {
      balances: { hyperliquidUsdc: 0, arbitrumEth: 0, arbitrumUsdc: 0 },
      minUsdc: 10,
      minEth: 0.001,
      met: false,
    },
    goals: { active: 0, required: 1, met: false },
  });

  // Fetch balances and requirements
  const fetchRequirements = async () => {
    setIsLoading(true);
    try {
      const token = await getAccessToken();

      // Fetch wallet balances from our API
      const balanceRes = await fetch(`/api/agents/${agentId}/balances`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        const balances = data.balances || { hyperliquidUsdc: 0, arbitrumEth: 0, arbitrumUsdc: 0 };

        setRequirements(prev => ({
          ...prev,
          wallet: {
            ...prev.wallet,
            balances,
            met: balances.hyperliquidUsdc >= prev.wallet.minUsdc,
          },
        }));
      }

      // Update goals status
      const activeGoals = goals.filter(g => g.isActive).length;
      setRequirements(prev => ({
        ...prev,
        goals: {
          ...prev.goals,
          active: activeGoals,
          met: activeGoals >= prev.goals.required,
        },
      }));

      // Fetch credits from user account
      try {
        const creditsRes = await fetch('/api/credits', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setRequirements(prev => ({
            ...prev,
            credits: {
              ...prev.credits,
              current: creditsData.credits || 0,
              met: (creditsData.credits || 0) >= prev.credits.required,
            },
          }));
        }
      } catch (creditError) {
        console.error('Failed to fetch credits:', creditError);
        // Keep default credits value if fetch fails
        setRequirements(prev => ({
          ...prev,
          credits: {
            ...prev.credits,
            current: 100,
            met: 100 >= prev.credits.required,
          },
        }));
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRequirements, 30000);
    return () => clearInterval(interval);
  }, [agentId, goals]);

  const requirementsMet =
    requirements.credits.met &&
    requirements.wallet.met &&
    requirements.goals.met;

  const metCount = [
    requirements.credits.met,
    requirements.wallet.met,
    requirements.goals.met,
  ].filter(Boolean).length;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  const openExplorer = () => {
    window.open(`https://arbiscan.io/address/${walletAddress}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <PowerIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Agent Setup Checklist</h2>
            <p className="text-xs text-foreground-muted">Complete these steps to activate trading</p>
          </div>
          <button
            onClick={fetchRequirements}
            className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pt-4">
          <div className="flex gap-1 mb-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < metCount ? 'bg-primary' : 'bg-background-tertiary'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-foreground-muted text-center">{metCount}/3 requirements met</p>
        </div>

        {/* Checklist Items */}
        <div className="p-4 space-y-2">
          {/* Credit Balance */}
          <ChecklistItem
            title="Credit Balance"
            subtitle={`Need ${requirements.credits.required.toLocaleString()} credits`}
            isComplete={requirements.credits.met}
            isExpanded={expandedSection === 'credits'}
            onToggle={() => toggleSection('credits')}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground-muted">Current Balance</span>
                </div>
                <span className={`text-lg font-semibold ${requirements.credits.met ? 'text-foreground' : 'text-error'}`}>
                  {requirements.credits.current.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Required minimum</span>
                <span className="text-foreground">{requirements.credits.required.toLocaleString()} credits</span>
              </div>
              {!requirements.credits.met && (
                <>
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-xs text-error">
                      You need at least {requirements.credits.required.toLocaleString()} credits to run your agent.
                      Credits are used for AI processing during trading decisions.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBuyCreditsModal(true)}
                    className="w-full py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditIcon className="w-4 h-4" />
                    Purchase Credits
                  </button>
                </>
              )}
            </div>
          </ChecklistItem>

          {/* Agent Wallet Balance */}
          <ChecklistItem
            title="Agent Wallet Balance"
            subtitle="Fund your agent wallet"
            isComplete={requirements.wallet.met}
            isExpanded={expandedSection === 'wallet'}
            onToggle={() => toggleSection('wallet')}
          >
            <div className="space-y-3">
              {/* Exchange Selector */}
              <div className="text-center text-xs text-foreground-muted mb-2">Trading Exchange</div>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm font-medium">
                  <HyperliquidIcon className="w-4 h-4" />
                  Hyperliquid
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-3 bg-background-tertiary border border-border rounded-lg text-foreground-muted text-sm font-medium opacity-50 cursor-not-allowed">
                  <GmxIcon className="w-4 h-4" />
                  GMX
                </button>
              </div>

              {/* Wallet Address */}
              <div className="p-3 bg-background rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <WalletIcon className="w-4 h-4 text-foreground-muted" />
                    <span className="text-xs text-foreground-muted">Agent Wallet</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copyAddress}
                      className="p-1 rounded hover:bg-background-secondary text-foreground-muted hover:text-foreground"
                      title="Copy address"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={openExplorer}
                      className="p-1 rounded hover:bg-background-secondary text-foreground-muted hover:text-foreground"
                      title="View on explorer"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-mono text-foreground-muted">{walletAddress}</p>
              </div>

              {/* Hyperliquid Balance */}
              <div className={`p-3 rounded-lg border ${
                requirements.wallet.met
                  ? 'bg-success/5 border-success/20'
                  : 'bg-primary/5 border-primary/20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Hyperliquid USDC</span>
                  <span className={`text-lg font-semibold ${requirements.wallet.met ? 'text-success' : 'text-foreground'}`}>
                    ${requirements.wallet.balances.hyperliquidUsdc.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">
                  Need ${requirements.wallet.minUsdc} minimum
                </p>
              </div>

              {/* Bridge from Arbitrum */}
              <button className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1">
                Or bridge from Arbitrum
                <ArrowRightIcon className="w-3 h-3" />
              </button>

              {/* Arbitrum Balances */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs text-foreground-muted mb-1">ARB ETH (gas)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {requirements.wallet.balances.arbitrumEth.toFixed(4)} ETH
                  </p>
                  <p className={`text-xs ${requirements.wallet.balances.arbitrumEth >= requirements.wallet.minEth ? 'text-foreground-muted' : 'text-error'}`}>
                    Need {requirements.wallet.minEth} ETH
                  </p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs text-foreground-muted mb-1">ARB USDC</p>
                  <p className="text-sm font-semibold text-foreground">
                    ${requirements.wallet.balances.arbitrumUsdc.toFixed(2)}
                  </p>
                  <p className={`text-xs ${requirements.wallet.balances.arbitrumUsdc >= requirements.wallet.minUsdc ? 'text-foreground-muted' : 'text-error'}`}>
                    Need ${requirements.wallet.minUsdc}
                  </p>
                </div>
              </div>

              {/* Funding Instructions */}
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-xs text-primary font-medium mb-1">To fund your agent:</p>
                <p className="text-xs text-primary/80">
                  Send ETH or USDC to your agent wallet on Arbitrum, then use the bridge button to deposit to Hyperliquid.
                </p>
              </div>
            </div>
          </ChecklistItem>

          {/* Active Goals */}
          <ChecklistItem
            title="Active Goals"
            subtitle="Activate at least one goal"
            isComplete={requirements.goals.met}
            isExpanded={expandedSection === 'goals'}
            onToggle={() => toggleSection('goals')}
          >
            <div className="space-y-2">
              {goals.length === 0 ? (
                <p className="text-sm text-foreground-muted text-center py-4">
                  No goals configured. Add goals in the agent settings.
                </p>
              ) : (
                goals.map((goal) => (
                  <div
                    key={goal.id}
                    className={`p-3 rounded-lg border ${
                      goal.isActive
                        ? 'bg-success/5 border-success/20'
                        : 'bg-background border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${goal.isActive ? 'bg-success' : 'bg-foreground-muted'}`} />
                        <span className="text-sm font-medium text-foreground">{goal.description}</span>
                      </div>
                      <span className={`text-xs ${goal.isActive ? 'text-success' : 'text-foreground-muted'}`}>
                        {goal.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-2 bg-success text-white rounded-lg font-medium text-sm hover:bg-success/90 transition-colors flex items-center justify-center gap-2">
                  <PlayIcon className="w-4 h-4" />
                  Activate All
                </button>
                <button className="flex-1 py-2 bg-background-tertiary text-foreground rounded-lg font-medium text-sm hover:bg-background transition-colors flex items-center justify-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  View Goals
                </button>
              </div>
            </div>
          </ChecklistItem>

          {/* Activate Agent */}
          <ChecklistItem
            title="Activate Agent"
            subtitle="Start automated trading"
            isComplete={false}
            isExpanded={expandedSection === 'activate'}
            onToggle={() => toggleSection('activate')}
            showCheckbox={false}
          >
            <div className="space-y-3">
              {!requirementsMet ? (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning font-medium mb-2 flex items-center gap-2">
                    <WarningIcon className="w-4 h-4" />
                    Requirements not met
                  </p>
                  <p className="text-xs text-warning/80 mb-2">
                    Complete the steps above to activate your agent:
                  </p>
                  <ul className="text-xs text-warning/80 space-y-1">
                    {!requirements.credits.met && (
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning/60" />
                        Purchase {(requirements.credits.required - requirements.credits.current).toLocaleString()} more credits
                      </li>
                    )}
                    {!requirements.wallet.met && (
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning/60" />
                        Fund your agent wallet with trading capital
                      </li>
                    )}
                    {!requirements.goals.met && (
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning/60" />
                        Activate at least one goal
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium flex items-center gap-2">
                    <CheckIcon className="w-4 h-4" />
                    All requirements met!
                  </p>
                  <p className="text-xs text-success/80 mt-1">
                    Your agent is ready to start automated trading.
                  </p>
                </div>
              )}
              <button
                onClick={onActivate}
                disabled={!requirementsMet}
                className={`w-full py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  requirementsMet
                    ? 'bg-success text-white hover:bg-success/90'
                    : 'bg-background-tertiary text-foreground-muted cursor-not-allowed'
                }`}
              >
                <PowerIcon className="w-4 h-4" />
                {requirementsMet ? 'Activate Agent' : 'Complete Requirements First'}
              </button>
            </div>
          </ChecklistItem>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <p className="text-xs text-foreground-muted text-center">
            Auto-refreshes every 30s • Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
        currentCredits={requirements.credits.current}
        onPurchaseComplete={(newBalance) => {
          setRequirements(prev => ({
            ...prev,
            credits: {
              ...prev.credits,
              current: newBalance,
              met: newBalance >= prev.credits.required,
            },
          }));
          setShowBuyCreditsModal(false);
        }}
      />
    </div>
  );
}

// Checklist Item Component
function ChecklistItem({
  title,
  subtitle,
  isComplete,
  isExpanded,
  onToggle,
  showCheckbox = true,
  children,
}: {
  title: string;
  subtitle: string;
  isComplete: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  showCheckbox?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-background-tertiary/50 transition-colors"
      >
        {showCheckbox && (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isComplete ? 'bg-success border-success' : 'border-foreground-muted'
          }`}>
            {isComplete && <CheckIcon className="w-3 h-3 text-white" />}
          </div>
        )}
        {!showCheckbox && (
          <div className="w-5 h-5 rounded-full border-2 border-foreground-muted flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-foreground-muted" />
          </div>
        )}
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-foreground-muted">{subtitle}</p>
        </div>
        <ChevronIcon className={`w-4 h-4 text-foreground-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

// Icons
function PowerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v10M18.36 6.64a9 9 0 11-12.73 0" />
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CreditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M15 9.5c-.5-1-1.5-1.5-3-1.5-2 0-3 1-3 2.5s1 2 3 2.5 3 1.5 3 2.5-1 2.5-3 2.5c-1.5 0-2.5-.5-3-1.5" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 002 2h14v-4" />
      <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function HyperliquidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function GmxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 6v12l8 4 8-4V6l-8-4zm0 2.5L18 8l-6 3.5L6 8l6-3.5z" />
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
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

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
    </svg>
  );
}
