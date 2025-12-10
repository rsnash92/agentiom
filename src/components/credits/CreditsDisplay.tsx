'use client';

import { useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { BuyCreditsModal } from './BuyCreditsModal';

interface CreditsDisplayProps {
  variant?: 'header' | 'sidebar' | 'compact';
  showBuyButton?: boolean;
}

export function CreditsDisplay({
  variant = 'header',
  showBuyButton = true,
}: CreditsDisplayProps) {
  const { credits, isLoading, refreshCredits } = useCredits();
  const [showBuyModal, setShowBuyModal] = useState(false);

  const handlePurchaseComplete = (newBalance: number) => {
    refreshCredits();
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setShowBuyModal(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <CreditIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {isLoading ? '...' : credits.toLocaleString()}
          </span>
        </button>
        <BuyCreditsModal
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          currentCredits={credits}
          onPurchaseComplete={handlePurchaseComplete}
        />
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <div className="p-3 bg-background rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground-muted">Credits</span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              {isLoading ? '...' : credits.toLocaleString()}
            </span>
          </div>
          {showBuyButton && (
            <button
              onClick={() => setShowBuyModal(true)}
              className="w-full py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Buy Credits
            </button>
          )}
        </div>
        <BuyCreditsModal
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          currentCredits={credits}
          onPurchaseComplete={handlePurchaseComplete}
        />
      </>
    );
  }

  // Default: header variant
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-tertiary border border-border">
          <CreditIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {isLoading ? '...' : credits.toLocaleString()}
          </span>
        </div>
        {showBuyButton && (
          <button
            onClick={() => setShowBuyModal(true)}
            className="px-3 py-1.5 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Buy
          </button>
        )}
      </div>
      <BuyCreditsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        currentCredits={credits}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
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
