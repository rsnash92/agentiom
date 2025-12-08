'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className = '' }: ConnectButtonProps) {
  const { ready, authenticated, login, logout, user, exportWallet } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!ready) {
    return (
      <button
        disabled
        className={`px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border text-foreground-muted ${className}`}
      >
        <span className="flex items-center gap-2">
          <LoadingSpinner />
          Loading...
        </span>
      </button>
    );
  }

  if (authenticated && user) {
    const walletAddress = user.wallet?.address;
    const displayName =
      user.email?.address?.split('@')[0] ||
      (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null) ||
      'Connected';

    const copyAddress = async () => {
      if (walletAddress) {
        await navigator.clipboard.writeText(walletAddress);
      }
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-card-hover hover:border-border-hover transition-colors ${className}`}
        >
          <div className="w-2 h-2 rounded-full bg-success" />
          {displayName}
          <ChevronIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-xl z-50 py-2">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-medium text-foreground">{displayName}</div>
              {user.email?.address && (
                <div className="text-xs text-foreground-muted mt-0.5">{user.email.address}</div>
              )}
              {walletAddress && (
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-foreground mt-1.5 font-mono"
                >
                  {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                  <CopyIcon className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <DashboardIcon className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/agents"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <AgentIcon className="w-4 h-4" />
                My Agents
              </Link>
              {walletAddress && (
                <button
                  onClick={() => {
                    exportWallet();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
                >
                  <KeyIcon className="w-4 h-4" />
                  Export Wallet
                </button>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-border pt-1 mt-1">
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
              >
                <LogoutIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className={`btn-primary px-4 py-2 text-sm rounded-lg ${className}`}
    >
      Connect
    </button>
  );
}

// Icons
function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
