import { NextRequest, NextResponse } from 'next/server';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// Interval to milliseconds mapping
const intervalToMs: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coin = searchParams.get('coin') || 'BTC';
  const interval = searchParams.get('interval') || '1h';
  const limit = parseInt(searchParams.get('limit') || '500');

  // Calculate time range
  const endTime = Date.now();
  const intervalMs = intervalToMs[interval] || intervalToMs['1h'];
  const startTime = endTime - limit * intervalMs;

  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: {
          coin,
          interval,
          startTime,
          endTime,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to lightweight-charts format
    // Hyperliquid returns: { T: timestamp, o: open, h: high, l: low, c: close, v: volume }
    const candles = data.map((candle: { T: number; o: string; h: string; l: string; c: string; v: string }) => ({
      time: Math.floor(candle.T / 1000), // Convert to seconds for lightweight-charts
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v),
    }));

    return NextResponse.json(candles);
  } catch (error) {
    console.error('Error fetching candles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candle data' },
      { status: 500 }
    );
  }
}
