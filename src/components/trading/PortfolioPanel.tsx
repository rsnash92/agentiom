'use client';

import { useState } from 'react';

interface PortfolioPanelProps {
  agentName: string;
  walletAddress?: string;
  totalValue?: number;
  liquidValue?: number;
  tokensCount?: number;
  nftsCount?: number;
  protocolsCount?: number;
  currentPrice?: number;
  network?: string;
}

export function PortfolioPanel({
  agentName,
  walletAddress = '0x2E22b5b8FD7AbdC1b9A5911c8d4016a40e1A3848',
  totalValue = 0,
  liquidValue = 0,
  tokensCount = 0,
  nftsCount = 0,
  protocolsCount = 0,
  currentPrice = 0,
  network = 'Arbitrum',
}: PortfolioPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background-secondary overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
          <WalletIcon className="w-5 h-5 text-foreground-muted" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{agentName} Wallet</h3>
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live data
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Fund Agent Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <TargetIcon className="w-4 h-4 text-foreground-muted" />
            <span className="text-sm font-semibold">Fund Agent</span>
          </div>
          <p className="text-xs text-foreground-muted text-center mb-4">
            Send collateral tokens to start trading BTC
          </p>

          {/* QR Code Placeholder */}
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
              <QRCodeIcon className="w-24 h-24 text-black" />
            </div>
          </div>

          {/* Wallet Address */}
          <div className="text-[10px] text-foreground-subtle uppercase text-center mb-2">
            Wallet Address
          </div>
          <div className="flex items-center gap-2 bg-background rounded-lg p-2">
            <span className="flex-1 text-xs font-mono text-foreground truncate">
              {walletAddress}
            </span>
            <button
              onClick={copyAddress}
              className="p-1.5 rounded hover:bg-card text-foreground-muted hover:text-foreground transition-colors"
            >
              {copied ? <CheckIcon className="w-4 h-4 text-success" /> : <CopyIcon className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Fund */}
          <div className="mt-4 p-3 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <BoxIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Quick Fund from Wallet</span>
            </div>
            <p className="text-[11px] text-foreground-subtle mb-3">
              Send transactions directly from your connected wallet to fund the agent
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-success/20 text-success text-xs font-medium rounded-lg hover:bg-success/30 transition-colors">
                <TrendUpIcon className="w-3.5 h-3.5" />
                Fund WBTC.b
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-warning/20 text-warning text-xs font-medium rounded-lg hover:bg-warning/30 transition-colors">
                <TrendDownIcon className="w-3.5 h-3.5" />
                Fund WBTC.b
              </button>
            </div>
            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/20 text-primary text-xs font-medium rounded-lg hover:bg-primary/30 transition-colors">
              <BoltIcon className="w-3.5 h-3.5" />
              Send Gas (ETH)
            </button>
            <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-foreground-subtle">
              <ClockIcon className="w-3 h-3" />
              ETH price: $3030.14
            </div>
          </div>

          {/* Network Info */}
          <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ExternalLinkIcon className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-blue-400">Network: {network}</span>
            </div>
            <p className="text-[11px] text-foreground-subtle">
              Send tokens on the correct network. Minimum $100-500 recommended.
            </p>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">Portfolio Overview</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">${totalValue}</div>
              <div className="text-[10px] text-foreground-subtle uppercase">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">${liquidValue}</div>
              <div className="text-[10px] text-foreground-subtle uppercase">Liquid Value</div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Tokens</span>
              <span className="font-medium">{tokensCount}</span>
              <span className="text-foreground-muted">NFTs</span>
              <span className="font-medium">{nftsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Protocols</span>
              <span className="font-medium">{protocolsCount}</span>
            </div>
          </div>
        </div>

        {/* Largest Holding */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendUpIcon className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">Largest Holding</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium">N/A</div>
              <div className="text-[11px] text-foreground-subtle">0 tokens</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">$0</div>
              <div className="text-[11px] text-foreground-subtle">$0 each</div>
            </div>
          </div>
        </div>

        {/* Network Distribution */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <NetworkIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Network Distribution</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div>
                <span className="text-xs font-medium text-blue-400">Arbitrum (Active)</span>
                <div className="text-[10px] text-foreground-subtle">0 tokens</div>
              </div>
              <span className="text-xs font-medium">$0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-border">
              <div>
                <span className="text-xs font-medium text-foreground-muted">Avalanche</span>
                <div className="text-[10px] text-foreground-subtle">0 tokens</div>
              </div>
              <span className="text-xs font-medium">$0</span>
            </div>
          </div>
        </div>

        {/* BTC Market & Collateral Options */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <TargetIcon className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">BTC Market & Collateral Options</span>
          </div>

          <div className="bg-background rounded-lg p-3 text-center mb-3">
            <div className="text-xs text-primary mb-1">Current Price</div>
            <div className="text-lg font-bold">${currentPrice.toFixed(2)}</div>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendUpIcon className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium text-success">Long Collateral</span>
                </div>
                <span className="text-xs font-mono text-foreground-muted">WBTC.b</span>
              </div>
              <p className="text-[10px] text-foreground-subtle">
                Using WBTC.b increases exposure to BTC price movements.
              </p>
            </div>

            <div className="p-3 bg-background rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendDownIcon className="w-4 h-4 text-error" />
                  <span className="text-xs font-medium text-error">Short Collateral</span>
                </div>
                <span className="text-xs font-mono text-foreground-muted">WBTC.b</span>
              </div>
              <p className="text-[10px] text-foreground-subtle">
                Using WBTC.b keeps your collateral stable for isolated exposure.
              </p>
            </div>
          </div>
        </div>

        {/* Available Collateral */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <BoxIcon className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">Available Collateral ({network})</span>
          </div>
          <p className="text-[11px] text-foreground-subtle mb-4">
            Your tokens suitable for GMX trading collateral
          </p>
          <div className="text-center py-4">
            <p className="text-xs text-foreground-muted mb-1">
              No suitable collateral tokens found on {network}
            </p>
            <p className="text-[10px] text-foreground-subtle">
              Consider funding with USDC, ETH, or other major tokens on this network
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center mb-3">
            <FolderIcon className="w-6 h-6 text-foreground-subtle" />
          </div>
          <h4 className="text-sm font-medium text-foreground-muted mb-1">No Tokens Found</h4>
          <p className="text-xs text-foreground-subtle">
            This wallet appears to be empty or the tokens haven't loaded yet.
          </p>
        </div>
      </div>
    </div>
  );
}

// Icons
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
      <path d="M3 5v14a2 2 0 002 2h16v-5" />
      <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function QRCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v3h-1v-3zm-1 3h1v1h-1v-1zm4 0h1v1h-1v-1zm-2 1h1v1h-1v-1zm2 1h1v2h-2v-1h1v-1zm-4 1h1v1h-1v-1zm2 1h2v1h-2v-1z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function TrendDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function PieChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="8" height="8" rx="2" />
      <rect x="14" y="2" width="8" height="8" rx="2" />
      <rect x="8" y="14" width="8" height="8" rx="2" />
      <path d="M6 10v4M18 10v4M10 18h4" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}
