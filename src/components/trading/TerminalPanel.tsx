'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { AgentPerformanceStats } from './AgentPerformanceStats';

interface TerminalPanelProps {
  agentId: string;
  agentName: string;
}

type TabType = 'orders' | 'chat' | 'positions' | 'stats';

interface Order {
  id: string;
  agentName: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  symbol: string;
  price: number;
  quantity: number;
  filledAmount: number;
  leverage: number;
  timestamp: Date;
  realizedPnl?: number;
}

interface ChatMessage {
  id: string;
  agentName: string;
  content: string;
  timestamp: Date;
  isExpanded: boolean;
}

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPct: number;
  leverage: number;
}

// Symbol icons/colors
const SYMBOL_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#9945FF',
  BNB: '#F0B90B',
  DOGE: '#C2A633',
  XRP: '#23292F',
  HYPE: '#00D4AA',
  ASTER: '#FF6B6B',
  AVAX: '#E84142',
  LINK: '#2A5ADA',
  ARB: '#12AAFF',
  OP: '#FF0420',
  MATIC: '#8247E5',
  ATOM: '#2E3148',
  APT: '#00CBC6',
  SUI: '#6FBCF0',
};

export function TerminalPanel({ agentId, agentName }: TerminalPanelProps) {
  const { getAccessToken } = usePrivy();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out empty/failed orders (price $0 or quantity 0)
        const validOrders = data.orders
          .filter((order: { price: number; quantity: number; filledAmount: number }) =>
            order.price > 0 && (order.quantity > 0 || order.filledAmount > 0)
          )
          .map((order: {
            id: string;
            action: string;
            symbol: string;
            price: number;
            quantity: number;
            filledAmount: number;
            leverage: number;
            timestamp: string;
            realizedPnl?: number;
          }) => ({
            ...order,
            timestamp: new Date(order.timestamp),
          }));
        setOrders(validOrders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }, [agentId, getAccessToken]);

  // Fetch positions from API
  const fetchPositions = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPositions(data.open.map((pos: {
          id: string;
          symbol: string;
          side: 'LONG' | 'SHORT';
          size: number;
          sizeUsd: number;
          entryPrice: number;
          markPrice: number;
          unrealizedPnl: number;
          pnlPct: number;
          leverage: number;
        }) => ({
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side,
          size: pos.size,
          sizeUsd: pos.sizeUsd,
          entryPrice: pos.entryPrice,
          markPrice: pos.markPrice,
          pnl: pos.unrealizedPnl,
          pnlPct: pos.pnlPct,
          leverage: pos.leverage,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  }, [agentId, getAccessToken]);

  // Fetch chat messages (decision logs) from API
  const fetchMessages = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/agents/${agentId}/logs?type=decision`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.logs.map((log: {
          id: string;
          content: string;
          timestamp: string;
        }) => ({
          id: log.id,
          agentName: agentName,
          content: log.content,
          timestamp: new Date(log.timestamp),
          isExpanded: false,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [agentId, agentName, getAccessToken]);

  // Initial data fetch
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await Promise.all([fetchOrders(), fetchPositions(), fetchMessages()]);
      setIsLoading(false);
    }
    loadData();
  }, [fetchOrders, fetchPositions, fetchMessages]);

  // Refresh data periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
      fetchPositions();
      fetchMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchPositions, fetchMessages]);

  const toggleMessageExpand = (id: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === id ? { ...msg, isExpanded: !msg.isExpanded } : msg
      )
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs = [
    { id: 'orders' as const, label: 'ORDER HISTORY' },
    { id: 'chat' as const, label: 'MODEL CHAT' },
    { id: 'positions' as const, label: 'POSITIONS' },
    { id: 'stats' as const, label: 'STATS' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium tracking-wide transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Order History Tab */}
        {activeTab === 'orders' && !isLoading && (
          <div className="divide-y divide-border">
            {orders.length === 0 ? (
              <div className="p-4">
                <div className="text-center text-foreground-muted text-sm py-8">
                  No order history yet
                </div>
              </div>
            ) : (
              <>
                {orders.map((order) => (
                  <div key={order.id} className="p-3 sm:p-4 hover:bg-background-secondary/50 transition-colors">
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Symbol Icon */}
                      <div
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold text-black"
                        style={{ backgroundColor: SYMBOL_COLORS[order.symbol] || '#666' }}
                      >
                        {order.symbol.charAt(0)}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                          <span className="text-[10px] sm:text-xs font-medium text-primary">{agentName.toUpperCase()}</span>
                          <span className={`text-[10px] sm:text-xs font-semibold ${order.action === 'BUY' ? 'text-success' : order.action === 'SELL' ? 'text-error' : 'text-foreground-muted'}`}>
                            {order.action}
                          </span>
                          <span
                            className="text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${SYMBOL_COLORS[order.symbol]}20`, color: SYMBOL_COLORS[order.symbol] || '#666' }}
                          >
                            {order.symbol}
                          </span>
                          <span className="text-[10px] sm:text-xs text-foreground-subtle ml-auto">{formatTime(order.timestamp)}</span>
                        </div>

                        {/* Order Stats - Mobile: 2 cols, Desktop: 5 cols */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 text-[10px] sm:text-xs">
                          <div>
                            <span className="text-foreground-subtle">Price: </span>
                            <span className="text-foreground font-medium">${order.price.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-foreground-subtle">Size: </span>
                            <span className="text-foreground font-medium">${order.filledAmount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-subtle">Qty: </span>
                            <span className="text-foreground font-medium">{order.quantity.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-subtle">Lev: </span>
                            <span className="text-foreground font-medium">{order.leverage}x</span>
                          </div>
                          {order.realizedPnl !== undefined && order.action === 'CLOSE' && (
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-foreground-subtle">P&L: </span>
                              <span className={`font-medium ${order.realizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                                {order.realizedPnl >= 0 ? '+' : ''}${order.realizedPnl.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* No more orders message */}
                <div className="p-4 text-center text-foreground-subtle text-xs">
                  No more orders
                </div>
              </>
            )}
          </div>
        )}

        {/* Model Chat Tab */}
        {activeTab === 'chat' && !isLoading && (
          <div className="divide-y divide-border">
            {messages.length === 0 ? (
              <div className="p-4">
                <div className="text-center text-foreground-muted text-sm py-8">
                  No model chat history yet
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="p-3 sm:p-4 hover:bg-background-secondary/50 transition-colors">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <AgentIcon className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-xs font-medium text-primary">{agentName.toUpperCase()}</span>
                        <span className="text-[10px] sm:text-xs text-foreground-subtle">{formatTime(message.timestamp)}</span>
                      </div>
                      <p className={`text-xs sm:text-sm text-foreground leading-relaxed ${!message.isExpanded ? 'line-clamp-3' : ''}`}>
                        {message.content}
                      </p>
                      {message.content.length > 150 && (
                        <button
                          onClick={() => toggleMessageExpand(message.id)}
                          className="text-[10px] sm:text-xs text-foreground-muted hover:text-foreground mt-1"
                        >
                          {message.isExpanded ? 'Show less' : 'Expand'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Optimize Prompt Button */}
            <div className="p-3 sm:p-4 flex justify-center">
              <button className="px-4 sm:px-6 py-2 border-2 border-primary text-primary rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/10 transition-colors">
                Optimize Prompt
              </button>
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && !isLoading && (
          <div className="p-3 sm:p-4">
            {positions.length === 0 ? (
              <div className="text-center text-foreground-muted text-xs sm:text-sm py-6 sm:py-8">
                No open positions
              </div>
            ) : (
              <div className="space-y-2">
                {positions.map((position) => (
                  <div key={position.id} className="p-2.5 sm:p-3 bg-background-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span
                          className="text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${SYMBOL_COLORS[position.symbol]}20`, color: SYMBOL_COLORS[position.symbol] }}
                        >
                          {position.symbol}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-semibold ${position.side === 'LONG' ? 'text-success' : 'text-error'}`}>
                          {position.side}
                        </span>
                        <span className="text-[10px] sm:text-xs text-foreground-muted">{position.leverage}x</span>
                      </div>
                      <span className={`text-xs sm:text-sm font-medium ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                        {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)} <span className="hidden sm:inline">({position.pnlPct >= 0 ? '+' : ''}{position.pnlPct.toFixed(2)}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-foreground-muted">
                      <span>Size: {position.size.toFixed(4)}</span>
                      <span>Entry: ${position.entryPrice.toLocaleString()}</span>
                      <span className="hidden sm:inline">Mark: ${position.markPrice.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="p-3 sm:p-4 overflow-auto">
            <AgentPerformanceStats agentId={agentId} compact />
          </div>
        )}
      </div>
    </div>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
