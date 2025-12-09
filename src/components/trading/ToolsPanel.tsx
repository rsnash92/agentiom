'use client';

import { useState } from 'react';
import { CollapsibleSection, FormInput, FormSelect, ActionButton } from '@/components/ui/trading-form';

interface ToolsPanelProps {
  onToolSelect?: (toolId: string) => void;
}

export function ToolsPanel({ }: ToolsPanelProps) {
  const [bridgeAmount, setBridgeAmount] = useState('');
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [sourceChain, setSourceChain] = useState('Ethereum');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Hyperliquid Bridge */}
        <CollapsibleSection title="Hyperliquid Bridge" defaultOpen>
          <div className="space-y-3">
            <p className="text-[10px] text-foreground-muted">
              Bridge USDC from Arbitrum to Hyperliquid for trading
            </p>
            <FormInput
              label="Amount (USDC)"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              placeholder="0.00"
            />
            <ActionButton variant="primary">
              Bridge to Hyperliquid
            </ActionButton>
          </div>
        </CollapsibleSection>

        {/* Collateral Converter */}
        <CollapsibleSection title="Collateral Converter" defaultOpen={false}>
          <div className="space-y-3">
            <p className="text-[10px] text-foreground-muted">
              Convert tokens for optimal trading collateral
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="From"
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                options={[
                  { value: 'ETH', label: 'ETH' },
                  { value: 'USDC', label: 'USDC' },
                  { value: 'WBTC', label: 'WBTC' },
                ]}
              />
              <FormSelect
                label="To"
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                options={[
                  { value: 'USDC', label: 'USDC' },
                  { value: 'ETH', label: 'ETH' },
                  { value: 'WBTC', label: 'WBTC' },
                ]}
              />
            </div>
            <ActionButton variant="primary">
              Convert Collateral
            </ActionButton>
          </div>
        </CollapsibleSection>

        {/* Chain Bridge */}
        <CollapsibleSection title="Chain Bridge" defaultOpen={false}>
          <div className="space-y-3">
            <p className="text-[10px] text-foreground-muted">
              Consolidate agent funds from other chains into Arbitrum
            </p>
            <FormSelect
              label="Source Chain"
              value={sourceChain}
              onChange={(e) => setSourceChain(e.target.value)}
              options={[
                { value: 'Ethereum', label: 'Ethereum' },
                { value: 'Polygon', label: 'Polygon' },
                { value: 'Avalanche', label: 'Avalanche' },
                { value: 'Optimism', label: 'Optimism' },
              ]}
            />
            <ActionButton variant="primary">
              Bridge to Arbitrum
            </ActionButton>
          </div>
        </CollapsibleSection>

        {/* Transfer Tool */}
        <CollapsibleSection title="Transfer Tool" defaultOpen={false}>
          <div className="space-y-3">
            <p className="text-[10px] text-foreground-muted">
              Send tokens to other agents or wallets
            </p>
            <FormInput
              label="Recipient Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
            />
            <FormInput
              label="Amount"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.00"
            />
            <ActionButton variant="success">
              Send Tokens
            </ActionButton>
          </div>
        </CollapsibleSection>

        {/* Withdraw Tool */}
        <CollapsibleSection title="Withdraw Tool" defaultOpen={false}>
          <div className="space-y-3">
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-[10px] text-error">
                Warning: This will withdraw all tokens from this agent to your connected wallet.
              </p>
            </div>
            <ActionButton variant="error">
              Withdraw All
            </ActionButton>
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/40">
        <p className="text-[10px] text-foreground-subtle text-center">
          Expand a tool above to use it
        </p>
      </div>
    </div>
  );
}
