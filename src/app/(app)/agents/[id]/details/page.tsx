'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useAgent, useAgents } from '@/lib/hooks';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number | null;
  leverage: number;
  unrealizedPnl: number;
  pnlPct: number;
  takeProfit: number | null;
  stopLoss: number | null;
  openedAt: string;
}

interface Order {
  id: string;
  side: 'BUY' | 'SELL';
  symbol: string;
  quantity: number;
  leverage: number;
  stopLoss: number | null;
  profitTarget: number | null;
  riskUsd: number;
  confidence: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

interface PerformanceData {
  initialBalance: number;
  currentBalance: number;
  unrealizedPnl: number;
  totalPnl: number;
  pnlPct: number;
}

function AgentDetailsPageContent() {
  const params = useParams();
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const agentId = params.id as string;

  const { agent, isLoading: agentLoading, error: agentError, toggleStatus } = useAgent(agentId);
  const { deleteAgent } = useAgents();

  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState<string | null>(null);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    if (!agentId) return;
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/positions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPositions(data.open || []);
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  }, [agentId, getAccessToken]);

  // Fetch orders from positions (both open and closed)
  const fetchOrders = useCallback(async () => {
    if (!agentId) return;
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/positions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Combine open and closed positions as orders
        const allOrders: Order[] = [
          ...(data.open || []).map((p: Position) => ({
            id: p.id,
            side: p.side === 'LONG' ? 'BUY' : 'SELL' as const,
            symbol: p.symbol,
            quantity: p.size,
            leverage: p.leverage,
            stopLoss: p.stopLoss,
            profitTarget: p.takeProfit,
            riskUsd: p.sizeUsd * 0.02, // Estimated 2% risk
            confidence: 70, // Default
            status: 'COMPLETED' as const,
            createdAt: p.openedAt,
          })),
        ];
        setOrders(allOrders.slice(0, 25));
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }, [agentId, getAccessToken]);

  // Fetch performance
  const fetchPerformance = useCallback(async () => {
    if (!agentId) return;
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/performance`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    }
  }, [agentId, getAccessToken]);

  // Initial fetch and polling
  useEffect(() => {
    fetchPositions();
    fetchOrders();
    fetchPerformance();
    const interval = setInterval(() => {
      fetchPositions();
      fetchPerformance();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPositions, fetchOrders, fetchPerformance]);

  // Close position
  const handleClosePosition = async (positionId: string) => {
    setIsClosing(positionId);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/trade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positionId, action: 'close' }),
      });
      if (response.ok) {
        fetchPositions();
        fetchPerformance();
      }
    } catch (error) {
      console.error('Failed to close position:', error);
    } finally {
      setIsClosing(null);
    }
  };

  // Delete agent
  const handleDelete = async () => {
    if (!agent) return;

    // Must pause first
    if (agent.status === 'active') {
      await toggleStatus();
    }

    setIsDeleting(true);
    try {
      const success = await deleteAgent(agent.id);
      if (success) {
        router.push('/agents');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Get LLM display name
  const getLLMDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      claude: 'Claude',
      openai: 'GPT-4',
      deepseek: 'DeepSeek V3.1',
    };
    return names[provider] || provider;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit'
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Loading state
  if (agentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (agentError || !agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Agent Not Found</h2>
          <Link href="/agents" className="text-primary hover:underline">
            Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const approvedPairs = agent.policies?.approvedPairs || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Back Link */}
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground text-sm mb-4 sm:mb-6"
        >
          <BackIcon className="w-4 h-4" />
          MY AGENTS
        </Link>

        {/* Agent Header - Stack on mobile */}
        <div className="flex flex-col lg:flex-row flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Left: Agent Info */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BotIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold">{agent.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  agent.status === 'active'
                    ? 'bg-success/20 text-success'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {agent.status === 'active' ? 'RUNNING' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-foreground-muted mt-1">
                Agent Model: <span className="text-foreground">{getLLMDisplayName(agent.llmProvider)}</span>
              </p>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Balance: <span className="text-foreground font-mono">{performance?.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '5,000.00'}</span>
              </p>
              <button
                onClick={() => toggleStatus()}
                className={`mt-2 px-3 py-1 text-xs font-medium rounded border ${
                  agent.status === 'active'
                    ? 'border-error/50 text-error hover:bg-error/10'
                    : 'border-success/50 text-success hover:bg-success/10'
                }`}
              >
                {agent.status === 'active' ? 'STOP' : 'START'}
              </button>
            </div>
          </div>

          {/* Center: Total P&L - Show inline on mobile */}
          <div className="flex lg:flex-1 lg:justify-center items-center lg:items-start">
            <div className="text-left lg:text-center">
              <p className="text-xs sm:text-sm text-foreground-muted">Total P&L:</p>
              <p className={`text-xl sm:text-2xl font-bold ${(performance?.totalPnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                {(performance?.totalPnl || 0) >= 0 ? '+' : ''}{performance?.totalPnl?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Right: Config Info */}
          <div className="w-full lg:w-auto lg:min-w-[300px] xl:min-w-[400px]">
            <p className="text-xs sm:text-sm text-foreground-muted mb-1">
              <span className="text-foreground-subtle">Symbols:</span>{' '}
              <span className="text-foreground">
                {approvedPairs.map(p => `${p}/USDT`).join(', ')}
              </span>
            </p>
            <p className="text-xs sm:text-sm text-foreground-muted mb-3 line-clamp-2">
              <span className="text-foreground-subtle">Prompt:</span>{' '}
              <span className="text-foreground">
                {agent.personality || "Default strategy"}
              </span>
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={`/agents/${agent.id}`}
                className="px-3 sm:px-4 py-1.5 bg-background-secondary text-foreground text-xs sm:text-sm font-medium rounded border border-border hover:bg-background-secondary/80"
              >
                EDIT
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs sm:text-sm text-error hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Active Positions */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xs sm:text-sm font-semibold tracking-wide">ACTIVE POSITIONS</h2>
            <p className="text-xs sm:text-sm">
              <span className="text-foreground-muted">UNREALIZED P&L:</span>{' '}
              <span className={totalUnrealizedPnl >= 0 ? 'text-success' : 'text-error'}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}{totalUnrealizedPnl.toFixed(2)}
              </span>
            </p>
          </div>

          {positions.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-foreground-muted">No active positions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      position.symbol.includes('BTC') ? 'bg-orange-500/20' :
                      position.symbol.includes('ETH') ? 'bg-blue-500/20' :
                      position.symbol.includes('SOL') ? 'bg-purple-500/20' :
                      position.symbol.includes('BNB') ? 'bg-yellow-500/20' :
                      position.symbol.includes('DOGE') ? 'bg-amber-500/20' :
                      'bg-primary/20'
                    }`}>
                      <span className="text-xs font-bold">{position.symbol.slice(0, 1)}</span>
                    </div>
                    <span className="font-semibold">{position.symbol.replace('USDT', '')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                    <div>
                      <span className="text-foreground-muted">Entry Price:</span>{' '}
                      <span className="font-mono">{position.entryPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Leverage:</span>{' '}
                      <span className="font-mono">{position.leverage}X</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Side:</span>{' '}
                      <span className={position.side === 'LONG' ? 'text-success' : 'text-error'}>
                        {position.side}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Liquidation:</span>{' '}
                      <span className="font-mono text-error">
                        {position.liquidationPrice?.toLocaleString() || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Quantity:</span>{' '}
                      <span className="font-mono">{position.size}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Unrealized P&L:</span>{' '}
                      <span className={`font-mono ${position.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                        {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-muted">Exit Plan:</span>
                      <button className="px-2 py-0.5 text-xs bg-background-secondary rounded border border-border hover:bg-background-secondary/80">
                        VIEW
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-muted">Action:</span>
                      <button
                        onClick={() => handleClosePosition(position.id)}
                        disabled={isClosing === position.id}
                        className="px-2 py-0.5 text-xs text-error border border-error/50 rounded hover:bg-error/10 disabled:opacity-50"
                      >
                        {isClosing === position.id ? 'CLOSING...' : 'CLOSE'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last 25 Orders */}
        <div>
          <h2 className="text-sm font-semibold tracking-wide mb-4">LAST 25 ORDERS</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-foreground-muted">
                  <th className="text-left px-4 py-3 font-medium">SIDE</th>
                  <th className="text-left px-4 py-3 font-medium">SYMBOL</th>
                  <th className="text-left px-4 py-3 font-medium">QUANTITY</th>
                  <th className="text-left px-4 py-3 font-medium">LEVERAGE</th>
                  <th className="text-left px-4 py-3 font-medium">STOP LOSS</th>
                  <th className="text-left px-4 py-3 font-medium">PROFIT TARGET</th>
                  <th className="text-left px-4 py-3 font-medium">RISK (USD)</th>
                  <th className="text-left px-4 py-3 font-medium">CONFIDENCE</th>
                  <th className="text-left px-4 py-3 font-medium">STATUS</th>
                  <th className="text-left px-4 py-3 font-medium">CREATED AT</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-foreground-muted">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-b-0 text-sm">
                      <td className={`px-4 py-3 font-medium ${order.side === 'BUY' ? 'text-success' : 'text-error'}`}>
                        {order.side}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            order.symbol.includes('BTC') ? 'bg-orange-500/20 text-orange-400' :
                            order.symbol.includes('ETH') ? 'bg-blue-500/20 text-blue-400' :
                            order.symbol.includes('SOL') ? 'bg-purple-500/20 text-purple-400' :
                            order.symbol.includes('BNB') ? 'bg-yellow-500/20 text-yellow-400' :
                            order.symbol.includes('DOGE') ? 'bg-amber-500/20 text-amber-400' :
                            'bg-primary/20 text-primary'
                          }`}>
                            {order.symbol.slice(0, 1)}
                          </div>
                          {order.symbol}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{order.quantity.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono">{order.leverage}X</td>
                      <td className="px-4 py-3 font-mono">{order.stopLoss?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 font-mono">{order.profitTarget?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 font-mono">{order.riskUsd.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono">{order.confidence}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          order.status === 'COMPLETED' ? 'text-success' :
                          order.status === 'PENDING' ? 'text-warning' :
                          'text-error'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Agent</h3>
            <p className="text-foreground-muted text-sm mb-6">
              Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone and all trading history will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-background-secondary text-foreground rounded-lg hover:bg-background-secondary/80"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentDetailsPage() {
  return (
    <ProtectedRoute>
      <AgentDetailsPageContent />
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

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
