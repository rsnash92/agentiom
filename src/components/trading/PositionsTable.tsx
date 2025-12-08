'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  positionValue: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  marginUsed: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
  takeProfit?: number;
  stopLoss?: number;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'stop' | 'take_profit';
  size: number;
  price: number;
  filled: number;
  status: 'open' | 'partial';
  createdAt: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  fee: number;
  pnl?: number;
  time: string;
}

interface PositionsTableProps {
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  onClosePosition?: (positionId: string) => void;
  onCancelOrder?: (orderId: string) => void;
}

type Tab = 'positions' | 'orders' | 'trades';

export function PositionsTable({
  positions,
  orders,
  trades,
  onClosePosition,
  onCancelOrder,
}: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-1">
          <TabButton
            active={activeTab === 'positions'}
            onClick={() => setActiveTab('positions')}
            count={positions.length}
          >
            Positions
          </TabButton>
          <TabButton
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            count={orders.length}
          >
            Open Orders
          </TabButton>
          <TabButton
            active={activeTab === 'trades'}
            onClick={() => setActiveTab('trades')}
          >
            Trades
          </TabButton>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-foreground-muted">Total PnL:</span>
            <span className={`ml-2 font-mono font-medium ${totalPnl >= 0 ? 'text-success' : 'text-error'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          </div>
          <button className="flex items-center gap-1 text-foreground-muted hover:text-foreground">
            <RefreshIcon className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'positions' && (
          <PositionsContent positions={positions} onClose={onClosePosition} />
        )}
        {activeTab === 'orders' && (
          <OrdersContent orders={orders} onCancel={onCancelOrder} />
        )}
        {activeTab === 'trades' && (
          <TradesContent trades={trades} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'text-foreground bg-card'
          : 'text-foreground-muted hover:text-foreground'
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
          active ? 'bg-primary text-black' : 'bg-border text-foreground-muted'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function PositionsContent({
  positions,
  onClose,
}: {
  positions: Position[];
  onClose?: (id: string) => void;
}) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
        <ChartIcon className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No active positions</p>
        <p className="text-xs text-foreground-subtle mt-1">Open a position on HYPERLIQUID to see it here</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-[11px] text-foreground-subtle border-b border-border">
          <th className="px-4 py-2 font-medium">Asset</th>
          <th className="px-4 py-2 font-medium">Position</th>
          <th className="px-4 py-2 font-medium">Position Value</th>
          <th className="px-4 py-2 font-medium">Entry Price</th>
          <th className="px-4 py-2 font-medium">Mark Price</th>
          <th className="px-4 py-2 font-medium">Liquidation Price</th>
          <th className="px-4 py-2 font-medium">Margin Used (PNL)</th>
          <th className="px-4 py-2 font-medium">TP / SL</th>
          <th className="px-4 py-2 font-medium">Close</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((position) => (
          <tr key={position.id} className="border-b border-border hover:bg-card/50 transition-colors">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full pair-icon ${position.symbol.toLowerCase().replace('-perp', '')}`} />
                <span className="text-sm font-medium">{position.symbol}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant={position.side === 'long' ? 'success' : 'error'} size="sm">
                  {position.side.toUpperCase()}
                </Badge>
                <span className="text-sm font-mono">{position.size}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm font-mono">${position.positionValue.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-mono">${position.entryPrice.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-mono">${position.markPrice.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-mono text-warning">${position.liquidationPrice.toLocaleString()}</td>
            <td className="px-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-mono">${position.marginUsed.toFixed(2)}</span>
                <span className={`text-xs font-mono ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                  {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)} ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm font-mono text-foreground-muted">
              {position.takeProfit || position.stopLoss ? (
                <span>
                  {position.takeProfit && <span className="text-success">${position.takeProfit}</span>}
                  {position.takeProfit && position.stopLoss && ' / '}
                  {position.stopLoss && <span className="text-error">${position.stopLoss}</span>}
                </span>
              ) : (
                '--'
              )}
            </td>
            <td className="px-4 py-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onClose?.(position.id)}
                className="text-xs"
              >
                Close
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrdersContent({
  orders,
  onCancel,
}: {
  orders: Order[];
  onCancel?: (id: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
        <OrdersIcon className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No open orders</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-[11px] text-foreground-subtle border-b border-border">
          <th className="px-4 py-2 font-medium">Symbol</th>
          <th className="px-4 py-2 font-medium">Type</th>
          <th className="px-4 py-2 font-medium">Side</th>
          <th className="px-4 py-2 font-medium">Price</th>
          <th className="px-4 py-2 font-medium">Size</th>
          <th className="px-4 py-2 font-medium">Filled</th>
          <th className="px-4 py-2 font-medium">Time</th>
          <th className="px-4 py-2 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="border-b border-border hover:bg-card/50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium">{order.symbol}</td>
            <td className="px-4 py-3 text-sm capitalize">{order.type.replace('_', ' ')}</td>
            <td className="px-4 py-3">
              <Badge variant={order.side === 'buy' ? 'success' : 'error'} size="sm">
                {order.side.toUpperCase()}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm font-mono">${order.price.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-mono">{order.size}</td>
            <td className="px-4 py-3 text-sm font-mono">{order.filled}/{order.size}</td>
            <td className="px-4 py-3 text-sm text-foreground-muted">{order.createdAt}</td>
            <td className="px-4 py-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel?.(order.id)}
                className="text-xs text-error hover:text-error"
              >
                Cancel
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradesContent({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-foreground-muted">
        <HistoryIcon className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No trade history</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-[11px] text-foreground-subtle border-b border-border">
          <th className="px-4 py-2 font-medium">Symbol</th>
          <th className="px-4 py-2 font-medium">Side</th>
          <th className="px-4 py-2 font-medium">Price</th>
          <th className="px-4 py-2 font-medium">Size</th>
          <th className="px-4 py-2 font-medium">Fee</th>
          <th className="px-4 py-2 font-medium">PnL</th>
          <th className="px-4 py-2 font-medium">Time</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => (
          <tr key={trade.id} className="border-b border-border hover:bg-card/50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium">{trade.symbol}</td>
            <td className="px-4 py-3">
              <Badge variant={trade.side === 'buy' ? 'success' : 'error'} size="sm">
                {trade.side.toUpperCase()}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm font-mono">${trade.price.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-mono">{trade.size}</td>
            <td className="px-4 py-3 text-sm font-mono text-foreground-muted">${trade.fee.toFixed(4)}</td>
            <td className="px-4 py-3 text-sm font-mono">
              {trade.pnl !== undefined ? (
                <span className={trade.pnl >= 0 ? 'text-success' : 'text-error'}>
                  {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                </span>
              ) : (
                '--'
              )}
            </td>
            <td className="px-4 py-3 text-sm text-foreground-muted">{trade.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 5-6" />
    </svg>
  );
}

function OrdersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
