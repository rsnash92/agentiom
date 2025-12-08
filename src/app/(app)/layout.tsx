'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { ConnectButton } from '@/components/auth/ConnectButton';

const navigation = [
  { name: 'New Agent', href: '/agents/new' },
  { name: 'Terminal', href: '/agents' },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-5 bg-background">
        {/* Left side - Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/discover" className="flex items-center">
            <Logo height={12} />
          </Link>

          <div className="flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-3.5 py-2 text-sm font-medium rounded-md transition-all',
                    isActive
                      ? 'text-foreground'
                      : 'text-foreground-muted hover:text-foreground hover:bg-card'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="flex items-center justify-center w-9 h-9 border border-border rounded-lg hover:bg-card hover:border-border-hover transition-colors">
            <BellIcon className="w-4 h-4" />
          </button>

          {/* Connect Button */}
          <ConnectButton />
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}

// Icons
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

