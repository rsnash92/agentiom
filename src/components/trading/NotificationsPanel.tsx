'use client';

import { useState } from 'react';
import { FormInput } from '@/components/ui/trading-form';

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
}: NotificationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BellIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-medium">Notifications</h3>
              <div className="text-[10px] text-foreground-muted">
                {totalCount} total, {unreadCount} unread
              </div>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-background-secondary text-foreground-muted hover:text-foreground transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>

        <FormInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notifications..."
        />

        <div className="flex items-center justify-end">
          <button
            onClick={onClearRead}
            className="text-[10px] text-foreground-muted hover:text-foreground transition-colors"
          >
            Clear Read
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-foreground-muted">
            <BellOffIcon className="w-12 h-12 mb-3 opacity-30" />
            <h4 className="text-sm font-medium text-foreground mb-1">No Notifications</h4>
            <p className="text-[10px] text-foreground-subtle">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
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
    <div className={`p-3 hover:bg-background-secondary/50 transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${typeStyles[notification.type]}`}>
          {notification.type === 'info' && <InfoIcon className="w-3 h-3" />}
          {notification.type === 'success' && <CheckIcon className="w-3 h-3" />}
          {notification.type === 'warning' && <WarningIcon className="w-3 h-3" />}
          {notification.type === 'error' && <ErrorIcon className="w-3 h-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h4 className="text-xs font-medium">{notification.title}</h4>
            {!notification.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-foreground-muted mb-1">{notification.message}</p>
          <span className="text-[10px] text-foreground-subtle">{notification.timestamp}</span>
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
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
