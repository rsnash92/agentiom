'use client';

import { useState } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const tools: Tool[] = [
  {
    id: 'hyperliquid-bridge',
    name: 'Hyperliquid Bridge',
    description: 'Bridge USDC from Arbitrum to Hyperliquid for trading',
    icon: SwapVerticalIcon,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  {
    id: 'collateral-converter',
    name: 'Collateral Converter',
    description: 'Convert tokens for optimal trading collateral',
    icon: SwapHorizontalIcon,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  {
    id: 'chain-bridge',
    name: 'Chain Bridge',
    description: 'Consolidate agent funds from other chains into Arbitrum',
    icon: BridgeIcon,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  {
    id: 'transfer-tool',
    name: 'Transfer Tool',
    description: 'Send tokens to other agents or wallets',
    icon: SendIcon,
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
  },
  {
    id: 'withdraw-tool',
    name: 'Withdraw Tool',
    description: 'Withdraw all tokens from your agent to your personal wallet',
    icon: WithdrawIcon,
    iconColor: 'text-error',
    iconBg: 'bg-error/10',
  },
];

interface ToolsPanelProps {
  onToolSelect?: (toolId: string) => void;
}

export function ToolsPanel({ onToolSelect }: ToolsPanelProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const handleToolClick = (toolId: string) => {
    setExpandedTool(expandedTool === toolId ? null : toolId);
    onToolSelect?.(toolId);
  };

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <SwapHorizontalIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Trading Tools</h3>
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Swap, bridge, and manage your tokens
          </div>
        </div>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            expanded={expandedTool === tool.id}
            onClick={() => handleToolClick(tool.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-foreground-subtle text-center">
          Click on a tool above to expand and use it
        </p>
      </div>
    </div>
  );
}

interface ToolCardProps {
  tool: Tool;
  expanded: boolean;
  onClick: () => void;
}

function ToolCard({ tool, expanded, onClick }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <div
      className={`bg-card rounded-xl border transition-colors cursor-pointer ${
        expanded ? 'border-primary' : 'border-border hover:border-border-hover'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-lg ${tool.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${tool.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{tool.name}</h4>
          <p className="text-xs text-foreground-muted">{tool.description}</p>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
          <div className="pt-4">
            <p className="text-xs text-foreground-subtle mb-3">
              This tool will be available soon. Configure your settings below:
            </p>
            <div className="space-y-3">
              {tool.id === 'hyperliquid-bridge' && (
                <>
                  <div>
                    <label className="text-[11px] text-foreground-muted block mb-1">Amount (USDC)</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    className="w-full py-2.5 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Bridge to Hyperliquid
                  </button>
                </>
              )}
              {tool.id === 'collateral-converter' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-foreground-muted block mb-1">From</label>
                      <select
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option>ETH</option>
                        <option>USDC</option>
                        <option>WBTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-foreground-muted block mb-1">To</label>
                      <select
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option>USDC</option>
                        <option>ETH</option>
                        <option>WBTC</option>
                      </select>
                    </div>
                  </div>
                  <button
                    className="w-full py-2.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Convert Collateral
                  </button>
                </>
              )}
              {tool.id === 'chain-bridge' && (
                <>
                  <div>
                    <label className="text-[11px] text-foreground-muted block mb-1">Source Chain</label>
                    <select
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option>Ethereum</option>
                      <option>Polygon</option>
                      <option>Avalanche</option>
                      <option>Optimism</option>
                    </select>
                  </div>
                  <button
                    className="w-full py-2.5 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Bridge to Arbitrum
                  </button>
                </>
              )}
              {tool.id === 'transfer-tool' && (
                <>
                  <div>
                    <label className="text-[11px] text-foreground-muted block mb-1">Recipient Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-foreground-muted block mb-1">Amount</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    className="w-full py-2.5 bg-success text-black text-xs font-semibold rounded-lg hover:bg-success/90 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Send Tokens
                  </button>
                </>
              )}
              {tool.id === 'withdraw-tool' && (
                <>
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-xs text-error">
                      Warning: This will withdraw all tokens from this agent to your connected wallet.
                    </p>
                  </div>
                  <button
                    className="w-full py-2.5 bg-error text-white text-xs font-semibold rounded-lg hover:bg-error/90 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Withdraw All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function SwapVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4M7 4L3 8M7 4l4 4" />
      <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
    </svg>
  );
}

function SwapHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H4" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

function BridgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H9" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h11" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function WithdrawIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
