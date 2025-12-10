'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useX402Payment } from '@/hooks/useX402Payment';
import { X402_CONFIG } from '@/lib/x402';
import type { Address } from 'viem';

// Credit package type
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  popular: boolean;
}

// Credit packages matching the screenshot
const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter Pack', credits: 1000, priceUsd: 10, popular: false },
  { id: 'popular', name: 'Popular Choice', credits: 5000, priceUsd: 45, popular: true },
  { id: 'pro', name: 'Pro Pack', credits: 10000, priceUsd: 80, popular: false },
  { id: 'enterprise', name: 'Enterprise', credits: 25000, priceUsd: 187.50, popular: false },
  { id: 'mega', name: 'Mega Pack', credits: 62500, priceUsd: 281.25, popular: false },
];

type PaymentMethod = 'web3' | 'coinbase';
type PurchaseStep = 'packages' | 'payment' | 'processing' | 'success' | 'error';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onPurchaseComplete?: (newBalance: number) => void;
}

export function BuyCreditsModal({
  isOpen,
  onClose,
  currentCredits,
  onPurchaseComplete,
}: BuyCreditsModalProps) {
  const [step, setStep] = useState<PurchaseStep>('packages');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { getAccessToken } = usePrivy();
  const { payCustom, isPaying, primaryWallet, authenticated } = useX402Payment();

  const handlePackageSelect = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setStep('payment');
  };

  const handleCustomAmountContinue = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 10) {
      setError('Minimum purchase is $10 USDC');
      return;
    }
    // Custom amount: 100 credits per $1
    const credits = Math.floor(amount * 100);
    setSelectedPackage({
      id: 'custom',
      name: 'Custom Amount',
      credits,
      priceUsd: amount,
      popular: false,
    });
    setStep('payment');
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'web3') {
      handleWeb3Payment();
    } else {
      // Coinbase Commerce - would redirect to hosted checkout
      handleCoinbasePayment();
    }
  };

  const handleWeb3Payment = async () => {
    if (!selectedPackage || !authenticated || !primaryWallet) {
      setError('Please connect your wallet first');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const receiver = X402_CONFIG.receiverAddress as Address;
      if (!receiver) {
        throw new Error('Payment receiver not configured');
      }

      const result = await payCustom(
        selectedPackage.priceUsd,
        receiver,
        X402_CONFIG.defaultChain
      );

      if (result.success && result.payment) {
        // Call API to grant credits
        const token = await getAccessToken();
        const grantResponse = await fetch('/api/credits/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txHash: result.payment.txHash,
            chainId: result.payment.chainId,
            amount: result.payment.amount,
            credits: selectedPackage.credits,
            packageId: selectedPackage.id,
          }),
        });

        if (!grantResponse.ok) {
          const errorData = await grantResponse.json();
          throw new Error(errorData.error || 'Failed to grant credits');
        }

        const { newBalance } = await grantResponse.json();
        setStep('success');
        onPurchaseComplete?.(newBalance);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setStep('error');
    }
  };

  const handleCoinbasePayment = async () => {
    // For now, show coming soon message
    // In production, this would redirect to Coinbase Commerce checkout
    setError('Coinbase Commerce integration coming soon. Please use Web3 Wallet.');
    setStep('error');
  };

  const handleBack = () => {
    if (step === 'payment') {
      setStep('packages');
      setSelectedPackage(null);
    } else if (step === 'error') {
      setStep('payment');
      setError(null);
    }
  };

  const handleClose = () => {
    setStep('packages');
    setSelectedPackage(null);
    setPaymentMethod(null);
    setError(null);
    setCustomAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {step !== 'packages' && step !== 'success' && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {step === 'packages' && 'Buy Credits'}
                {step === 'payment' && 'Select Payment Method'}
                {step === 'processing' && 'Processing Payment'}
                {step === 'success' && 'Purchase Complete'}
                {step === 'error' && 'Payment Error'}
              </h2>
              <p className="text-xs text-foreground-muted">
                Current balance: {currentCredits.toLocaleString()} credits
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Package Selection Step */}
          {step === 'packages' && (
            <div className="space-y-4">
              {/* Credit Packages */}
              <div className="space-y-2">
                {CREDIT_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg)}
                    className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                      pkg.popular
                        ? 'border-primary bg-primary/5 hover:bg-primary/10'
                        : 'border-border bg-background hover:bg-background-tertiary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        pkg.popular ? 'bg-primary/20 text-primary' : 'bg-background-tertiary text-foreground-muted'
                      }`}>
                        <CreditIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{pkg.name}</span>
                          {pkg.popular && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary text-black rounded font-medium">
                              BEST VALUE
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-foreground-muted">
                          {pkg.credits.toLocaleString()} credits
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-foreground">
                        ${pkg.priceUsd.toFixed(2)}
                      </span>
                      <p className="text-xs text-foreground-muted">
                        ${(pkg.priceUsd / pkg.credits * 100).toFixed(2)}/100 credits
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-foreground-muted mb-2">Or enter custom amount:</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">$</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                      min="10"
                      step="0.01"
                      className="w-full pl-7 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleCustomAmountContinue}
                    disabled={!customAmount}
                    className="px-4 py-2.5 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Continue
                  </button>
                </div>
                <p className="text-xs text-foreground-muted mt-1">
                  Minimum $10 USDC. You&apos;ll receive 100 credits per $1.
                </p>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          {step === 'payment' && selectedPackage && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground-muted">Package</span>
                  <span className="font-medium text-foreground">{selectedPackage.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground-muted">Credits</span>
                  <span className="font-medium text-foreground">{selectedPackage.credits.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-foreground-muted">Total</span>
                  <span className="text-lg font-semibold text-primary">${selectedPackage.priceUsd.toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Select Payment Method</p>

                {/* Web3 Wallet */}
                <button
                  onClick={() => handlePaymentMethodSelect('web3')}
                  disabled={isPaying || !authenticated}
                  className="w-full p-4 rounded-xl border border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <WalletIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Web3 Wallet</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded font-medium">
                          GASLESS
                        </span>
                      </div>
                      <span className="text-xs text-foreground-muted">
                        Pay with USDC on Base • No gas fees
                      </span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-foreground-muted" />
                  </div>
                  {primaryWallet && (
                    <div className="mt-2 p-2 bg-background rounded-lg">
                      <p className="text-xs text-foreground-muted">Connected wallet</p>
                      <p className="text-xs font-mono text-foreground truncate">
                        {primaryWallet.address}
                      </p>
                    </div>
                  )}
                </button>

                {/* Coinbase Commerce */}
                <button
                  onClick={() => handlePaymentMethodSelect('coinbase')}
                  disabled={isPaying}
                  className="w-full p-4 rounded-xl border border-border bg-background hover:bg-background-tertiary transition-all text-left opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0052FF]/20 flex items-center justify-center">
                      <CoinbaseIcon className="w-5 h-5 text-[#0052FF]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Coinbase Commerce</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-background-tertiary text-foreground-muted rounded font-medium">
                          COMING SOON
                        </span>
                      </div>
                      <span className="text-xs text-foreground-muted">
                        BTC, ETH, USDC and 10+ cryptocurrencies
                      </span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-foreground-muted" />
                  </div>
                </button>
              </div>

              {/* Network Info */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <InfoIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-primary font-medium">Payment Network: Base</p>
                    <p className="text-xs text-primary/80">
                      USDC transfers on Base are gasless via EIP-3009 authorization.
                      Funds are processed instantly after confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <LoadingSpinner className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Processing Payment</h3>
              <p className="text-sm text-foreground-muted">
                Please confirm the transaction in your wallet...
              </p>
              {selectedPackage && (
                <div className="mt-4 p-3 bg-background rounded-lg inline-block">
                  <p className="text-sm text-foreground">
                    {selectedPackage.credits.toLocaleString()} credits for ${selectedPackage.priceUsd.toFixed(2)} USDC
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && selectedPackage && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <CheckIcon className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Purchase Complete!</h3>
              <p className="text-sm text-foreground-muted mb-4">
                {selectedPackage.credits.toLocaleString()} credits have been added to your account.
              </p>
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <p className="text-sm text-foreground-muted">New Balance</p>
                <p className="text-2xl font-bold text-success">
                  {(currentCredits + selectedPackage.credits).toLocaleString()} credits
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
                <ErrorIcon className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Payment Failed</h3>
              <p className="text-sm text-error mb-4">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-background-tertiary text-foreground rounded-lg font-medium hover:bg-background transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
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

function CoinbaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
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

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
