'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MARKET_DATA, MARKET_CATEGORIES } from '@/config/constants';
import { useAllMarketsData } from '@/lib/hooks/useMarketData';

interface MarketSelectorProps {
  selectedCoin: string;
  onSelectCoin: (coin: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toPrecision(4);
}

export function MarketSelector({ selectedCoin, onSelectCoin, isOpen, onClose, onOpen }: MarketSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof MARKET_CATEGORIES>('all');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'volume'>('volume');
  const [sortDesc, setSortDesc] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['BTC', 'ETH', 'SOL']));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch live market data from Hyperliquid
  const { markets: liveMarkets, isLoading } = useAllMarketsData();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opening
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Filter and sort markets
  const filteredMarkets = useMemo(() => {
    // Merge static MARKET_DATA (categories) with live market data
    const markets = Object.entries(MARKET_DATA).map(([symbol, staticData]) => {
      const live = liveMarkets[symbol];
      return {
        symbol,
        category: staticData.category,
        maxLeverage: live?.maxLeverage || staticData.maxLeverage,
        price: live?.price || 0,
        change24h: live?.change24h || 0,
        volume24h: live?.volume24h || 0,
      };
    });

    let filtered = markets;

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'change':
          comparison = (a.change24h || 0) - (b.change24h || 0);
          break;
        case 'volume':
          comparison = (a.volume24h || 0) - (b.volume24h || 0);
          break;
      }
      return sortDesc ? -comparison : comparison;
    });

    // Put favorites first
    const favs = filtered.filter(m => favorites.has(m.symbol));
    const nonFavs = filtered.filter(m => !favorites.has(m.symbol));
    return [...favs, ...nonFavs];
  }, [searchQuery, selectedCategory, sortBy, sortDesc, favorites, liveMarkets]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (favorites.has(symbol)) {
      newFavorites.delete(symbol);
    } else {
      newFavorites.add(symbol);
    }
    setFavorites(newFavorites);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-border-hover transition-colors"
      >
        <span className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full pair-icon ${selectedCoin.toLowerCase()}`} />
          <span className="text-sm font-medium">{selectedCoin}</span>
        </span>
        <span className="text-xs text-foreground-subtle">HL</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[600px] bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search market"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'text-primary'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <StarIcon className={`w-3.5 h-3.5 ${selectedCategory === 'all' ? 'fill-primary' : ''}`} />
            </button>
            {Object.entries(MARKET_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as keyof typeof MARKET_CATEGORIES)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  selectedCategory === key
                    ? 'text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[24px_1fr_100px_80px_100px] gap-2 px-3 py-2 text-xs text-foreground-muted border-b border-border bg-background/50">
            <div></div>
            <button
              onClick={() => handleSort('symbol')}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Symbol
              {sortBy === 'symbol' && <SortIcon desc={sortDesc} />}
            </button>
            <button
              onClick={() => handleSort('price')}
              className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
            >
              Last
              {sortBy === 'price' && <SortIcon desc={sortDesc} />}
            </button>
            <button
              onClick={() => handleSort('change')}
              className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
            >
              24h%
              {sortBy === 'change' && <SortIcon desc={sortDesc} />}
            </button>
            <button
              onClick={() => handleSort('volume')}
              className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
            >
              Volume
              {sortBy === 'volume' && <SortIcon desc={sortDesc} />}
            </button>
          </div>

          {/* Market List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredMarkets.map((market) => (
              <button
                key={market.symbol}
                onClick={() => {
                  onSelectCoin(market.symbol);
                  onClose();
                }}
                className={`w-full grid grid-cols-[24px_1fr_100px_80px_100px] gap-2 px-3 py-2.5 text-sm hover:bg-background transition-colors items-center ${
                  selectedCoin === market.symbol ? 'bg-primary/5' : ''
                }`}
              >
                {/* Favorite Star */}
                <button
                  onClick={(e) => toggleFavorite(market.symbol, e)}
                  className="flex items-center justify-center"
                >
                  <StarIcon
                    className={`w-4 h-4 transition-colors ${
                      favorites.has(market.symbol)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  />
                </button>

                {/* Symbol with icon and leverage */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full pair-icon ${market.symbol.toLowerCase()}`} />
                  <span className="font-medium">{market.symbol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    market.maxLeverage >= 100
                      ? 'bg-success/20 text-success'
                      : market.maxLeverage >= 50
                        ? 'bg-primary/20 text-primary'
                        : 'bg-foreground-muted/20 text-foreground-muted'
                  }`}>
                    {market.maxLeverage}x
                  </span>
                </div>

                {/* Price */}
                <div className="text-right font-mono">
                  {formatPrice(market.price || 0)}
                </div>

                {/* 24h Change */}
                <div className={`text-right font-mono ${
                  (market.change24h || 0) >= 0 ? 'text-success' : 'text-error'
                }`}>
                  {(market.change24h || 0) >= 0 ? '+' : ''}{(market.change24h || 0).toFixed(2)}%
                </div>

                {/* Volume */}
                <div className="text-right font-mono text-foreground-muted">
                  {formatVolume(market.volume24h || 0)}
                </div>
              </button>
            ))}

            {isLoading && filteredMarkets.every(m => m.price === 0) && (
              <div className="py-8 text-center text-foreground-muted text-sm">
                Loading live prices...
              </div>
            )}

            {filteredMarkets.length === 0 && !isLoading && (
              <div className="py-8 text-center text-foreground-muted text-sm">
                No markets found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SortIcon({ desc }: { desc: boolean }) {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {desc ? (
        <path d="m7 10 5 5 5-5" />
      ) : (
        <path d="m7 14 5-5 5 5" />
      )}
    </svg>
  );
}
