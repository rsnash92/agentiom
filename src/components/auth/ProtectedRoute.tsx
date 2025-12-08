'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { ready, authenticated, login } = usePrivy();

  // Show loading state while Privy initializes
  if (!ready) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner className="w-8 h-8 text-foreground-muted" />
            <p className="text-sm text-foreground-muted">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // If not authenticated, show login prompt
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-6 p-8 bg-card border border-border rounded-xl max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center">
            <LockIcon className="w-8 h-8 text-foreground-muted" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Required
            </h2>
            <p className="text-sm text-foreground-muted">
              Please sign in to access this page. Connect your wallet or sign in with email to continue.
            </p>
          </div>
          <button
            onClick={login}
            className="btn-primary px-6 py-3 text-sm rounded-lg w-full"
          >
            Connect to Continue
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
