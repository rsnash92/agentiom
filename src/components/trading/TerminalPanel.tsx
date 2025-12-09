'use client';

import { useState } from 'react';

interface TerminalPanelProps {
  agentId: string;
  agentName: string;
}

type TabType = 'orders' | 'chat' | 'positions';

interface Order {
  id: string;
  agentName: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  price: number;
  quantity: number;
  filledAmount: number;
  leverage: number;
  timestamp: Date;
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
};

// Mock data for demonstration
const mockOrders: Order[] = [
  {
    id: '1',
    agentName: 'AGENT',
    action: 'BUY',
    symbol: 'SOL',
    price: 141.38,
    quantity: 1.4,
    filledAmount: 197.93,
    leverage: 8,
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: '2',
    agentName: 'AGENT',
    action: 'BUY',
    symbol: 'BNB',
    price: 917.6,
    quantity: 0.12,
    filledAmount: 110.11,
    leverage: 8,
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: '3',
    agentName: 'AGENT',
    action: 'BUY',
    symbol: 'ETH',
    price: 3293.29,
    quantity: 0.15,
    filledAmount: 493.99,
    leverage: 8,
    timestamp: new Date(Date.now() - 180000),
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    agentName: 'AGENT',
    content: 'Reduce outsized risk and correlation: close BTC and BNB shorts to lock gains and cut exposure; hold SOL short with existing exit plan. Market: 4H bearish, short-term bounce in BTC. Sharpe good; prioritize disciplined de-risking.',
    timestamp: new Date(Date.now() - 3600000),
    isExpanded: false,
  },
  {
    id: '2',
    agentName: 'AGENT',
    content: 'De-risk immediately: close BTC and BNB shorts to bring exposure within the 80% cap and lock in BTC gains/cut BNB loss. Maintain SOL short with the existing tight stop and target since 4H trend remains bearish and intraday momentum is stalling. No new trades.',
    timestamp: new Date(Date.now() - 7200000),
    isExpanded: false,
  },
];

const mockPositions: Position[] = [];

export function TerminalPanel({ agentName }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [orders] = useState<Order[]>(mockOrders);
  const [positions] = useState<Position[]>(mockPositions);

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
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs font-medium tracking-wide transition-colors ${
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
        {/* Order History Tab */}
        {activeTab === 'orders' && (
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
                  <div key={order.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Symbol Icon */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-black"
                        style={{ backgroundColor: SYMBOL_COLORS[order.symbol] || '#666' }}
                      >
                        {order.symbol.charAt(0)}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary">{agentName.toUpperCase()}</span>
                            <span className="text-xs text-foreground-muted">placed a</span>
                            <span className={`text-xs font-semibold ${order.action === 'BUY' ? 'text-success' : 'text-error'}`}>
                              {order.action}
                            </span>
                            <span className="text-xs text-foreground-muted">order on</span>
                            <span
                              className="text-xs font-medium px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${SYMBOL_COLORS[order.symbol]}20`, color: SYMBOL_COLORS[order.symbol] }}
                            >
                              {order.symbol}
                            </span>
                          </div>
                          <span className="text-xs text-foreground-subtle">{formatTime(order.timestamp)}</span>
                        </div>

                        {/* Order Stats */}
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-foreground-subtle">Price:</span>
                            <span className="ml-2 text-foreground font-medium">{order.price.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-foreground-subtle">Quantity:</span>
                            <span className="ml-2 text-foreground font-medium">{order.quantity.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-subtle">Filled Amount:</span>
                            <span className="ml-2 text-foreground font-medium">{order.filledAmount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-foreground-subtle">Leverage:</span>
                            <span className="ml-2 text-foreground font-medium">{order.leverage}x</span>
                          </div>
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
        {activeTab === 'chat' && (
          <div className="divide-y divide-border">
            {messages.map((message) => (
              <div key={message.id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <AgentIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary">{agentName.toUpperCase()}</span>
                      <span className="text-xs text-foreground-subtle">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className={`text-sm text-foreground leading-relaxed ${!message.isExpanded ? 'line-clamp-3' : ''}`}>
                      {message.content}
                    </p>
                    {message.content.length > 150 && (
                      <button
                        onClick={() => toggleMessageExpand(message.id)}
                        className="text-xs text-foreground-muted hover:text-foreground mt-1"
                      >
                        {message.isExpanded ? 'Show less' : 'Click to expand'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Optimize Prompt Button */}
            <div className="p-4 flex justify-center">
              <button className="px-6 py-2 border-2 border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10 transition-colors">
                Optimize Prompt
              </button>
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="p-4">
            {positions.length === 0 ? (
              <div className="text-center text-foreground-muted text-sm py-8">
                No open positions
              </div>
            ) : (
              <div className="space-y-2">
                {positions.map((position) => (
                  <div key={position.id} className="p-3 bg-background-secondary rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${SYMBOL_COLORS[position.symbol]}20`, color: SYMBOL_COLORS[position.symbol] }}
                        >
                          {position.symbol}
                        </span>
                        <span className={`text-xs font-semibold ${position.side === 'LONG' ? 'text-success' : 'text-error'}`}>
                          {position.side}
                        </span>
                        <span className="text-xs text-foreground-muted">{position.leverage}x</span>
                      </div>
                      <span className={`text-sm font-medium ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                        {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)} ({position.pnlPct >= 0 ? '+' : ''}{position.pnlPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-foreground-muted">
                      <span>Size: {position.size.toFixed(4)}</span>
                      <span>Entry: ${position.entryPrice.toLocaleString()}</span>
                      <span>Mark: ${position.markPrice.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
