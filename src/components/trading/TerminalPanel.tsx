'use client';

import { useState } from 'react';

interface TerminalPanelProps {
  agentId: string;
  agentName: string;
}

type TabType = 'orders' | 'chat' | 'positions';

interface ChatMessage {
  id: string;
  agentName: string;
  content: string;
  timestamp: Date;
  isExpanded: boolean;
}

// Mock data for demonstration
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
  {
    id: '3',
    agentName: 'AGENT',
    content: 'Reduce outsized exposure and avoid intraday squeeze: close BTC and BNB shorts; hold SOL short with existing stop/target. No new trades until better short setups emerge.',
    timestamp: new Date(Date.now() - 10800000),
    isExpanded: false,
  },
];

export function TerminalPanel({ agentName }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);

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
        {activeTab === 'orders' && (
          <div className="p-4">
            <div className="text-center text-foreground-muted text-sm py-8">
              No order history yet
            </div>
          </div>
        )}

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

        {activeTab === 'positions' && (
          <div className="p-4">
            <div className="text-center text-foreground-muted text-sm py-8">
              No open positions
            </div>
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
