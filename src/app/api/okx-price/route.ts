import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/okx-price
 *
 * Returns OKB/USDT price. Two modes:
 *
 * 1. Authenticated (preferred): Uses OKX DEX Aggregator API with HMAC signing
 *    to fetch a real swap quote for 1 OKB → USDT on X Layer (chainId 195).
 *    Requires OKX_DEX_API_KEY, OKX_DEX_SECRET_KEY, OKX_DEX_PASSPHRASE.
 *
 * 2. Public fallback: If DEX credentials are missing or the DEX call fails,
 *    falls back to the OKX public ticker API (no auth needed).
 */

const OKX_BASE = 'https://www.okx.com';
const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // native OKB
const USDT_XLAYER = '0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c';
const ONE_OKB = '1000000000000000000'; // 1e18 wei

function hmacSign(
  timestamp: string,
  method: string,
  path: string,
  secretKey: string,
): string {
  const prehash = timestamp + method + path;
  return crypto.createHmac('sha256', secretKey).update(prehash).digest('base64');
}

async function fetchDexPrice(
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Promise<string | null> {
  const query = `chainId=195&fromTokenAddress=${NATIVE_TOKEN}&toTokenAddress=${USDT_XLAYER}&amount=${ONE_OKB}`;
  const requestPath = `/api/v5/dex/aggregator/quote?${query}`;
  const timestamp = new Date().toISOString();
  const sign = hmacSign(timestamp, 'GET', requestPath, secretKey);

  try {
    const res = await fetch(`${OKX_BASE}${requestPath}`, {
      method: 'GET',
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    // DEX quote returns toTokenAmount in wei (USDT 18 decimals on X Layer)
    const toAmount = json?.data?.[0]?.toTokenAmount;
    if (!toAmount) return null;

    // Convert from wei to human-readable (18 decimals)
    const price = (Number(BigInt(toAmount)) / 1e18).toFixed(4);
    return price;
  } catch {
    return null;
  }
}

async function fetchPublicPrice(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://www.okx.com/api/v5/market/ticker?instId=OKB-USDT',
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.[0]?.last || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const apiKey = process.env.OKX_DEX_API_KEY;
    const secretKey = process.env.OKX_DEX_SECRET_KEY;
    const passphrase = process.env.OKX_DEX_PASSPHRASE;

    let price: string | null = null;
    let source: string = 'public';

    // Try authenticated DEX API first
    if (apiKey && secretKey && passphrase) {
      price = await fetchDexPrice(apiKey, secretKey, passphrase);
      if (price) source = 'dex';
    }

    // Fallback to public ticker
    if (!price) {
      price = await fetchPublicPrice();
      source = 'public';
    }

    if (!price) {
      return NextResponse.json(
        { error: 'Failed to fetch OKB price from OKX' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { price, source },
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
