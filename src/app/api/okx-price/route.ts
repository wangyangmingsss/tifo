import { NextResponse } from 'next/server';

/**
 * GET /api/okx-price
 *
 * Proxies the OKX public ticker API to fetch OKB/USDT price.
 * This is a PUBLIC endpoint — no auth headers needed for ticker data.
 *
 * The DEX aggregator API keys (for swap quotes) should be set as env vars:
 *   OKX_DEX_API_KEY
 *   OKX_DEX_SECRET_KEY
 *   OKX_DEX_PASSPHRASE
 * They are NOT used here but are referenced by other server-side routes.
 */
export async function GET() {
  try {
    const res = await fetch(
      'https://www.okx.com/api/v5/market/ticker?instId=OKB-USDT',
      { next: { revalidate: 60 } },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch OKB price from OKX' },
        { status: 502 },
      );
    }

    const json = await res.json();
    const last = json?.data?.[0]?.last;

    if (!last) {
      return NextResponse.json(
        { error: 'Unexpected response from OKX API' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { price: last },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (err) {
    console.error('OKX price fetch error:', err);
    return NextResponse.json(
      { error: 'Internal error fetching OKB price' },
      { status: 500 },
    );
  }
}
