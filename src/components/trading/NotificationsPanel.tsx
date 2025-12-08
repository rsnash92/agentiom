'use client';

import { useState } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsPanelProps {
  notifications?: Notification[];
  onRefresh?: () => void;
  onClearRead?: () => void;
  onDeselectAll?: () => void;
}

export function NotificationsPanel({
  notifications = [],
  onRefresh,
  onClearRead,
  onDeselectAll,
}: NotificationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {totalCount} total, {unreadCount} unread
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-card text-foreground-muted hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-primary text-black'
                  : 'hover:bg-card text-foreground-muted hover:text-foreground'
              }`}
              title="Filter"
            >
              <FilterIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onDeselectAll}
            className="text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            Deselect All
          </button>
          <button
            onClick={onClearRead}
            className="text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            Clear Read
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
            <BellOffIcon className="w-16 h-16 mb-4 opacity-30" />
            <h4 className="text-lg font-semibold text-foreground mb-1">No Notifications</h4>
            <p className="text-sm text-foreground-subtle">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
}

function NotificationCard({ notification }: NotificationCardProps) {
  const typeStyles = {
    info: 'bg-blue-500/10 text-blue-400',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  };

  return (
    <div
      className={`p-4 hover:bg-card/50 transition-colors ${
        !notification.read ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeStyles[notification.type]}`}>
          {notification.type === 'info' && <InfoIcon className="w-4 h-4" />}
          {notification.type === 'success' && <CheckIcon className="w-4 h-4" />}
          {notification.type === 'warning' && <WarningIcon className="w-4 h-4" />}
          {notification.type === 'error' && <ErrorIcon className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-foreground-muted mb-2">{notification.message}</p>
          <span className="text-[11px] text-foreground-subtle">{notification.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

// Icons
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0118 8" />
      <path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 00-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
