import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/okx-dex-quote?fromToken=&toToken=&amount=&chainId=
 *
 * Proxies the OKX DEX Aggregator quote API with proper HMAC authentication.
 * Uses OKX_DEX_API_KEY / OKX_DEX_SECRET_KEY / OKX_DEX_PASSPHRASE env vars.
 *
 * Defaults:
 *   chainId  = 195 (X Layer Testnet)
 *   fromToken = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE (native OKB)
 *   toToken  = 0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c (USDT on X Layer)
 *   amount   = 1000000000000000000 (1 OKB in wei)
 */

const OKX_DEX_BASE = 'https://www.okx.com';

function signRequest(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secretKey: string,
): string {
  const prehash = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(prehash)
    .digest('base64');
}

export async function GET(request: Request) {
  const apiKey = process.env.OKX_DEX_API_KEY;
  const secretKey = process.env.OKX_DEX_SECRET_KEY;
  const passphrase = process.env.OKX_DEX_PASSPHRASE;

  if (!apiKey || !secretKey || !passphrase) {
    return NextResponse.json(
      { error: 'OKX DEX API credentials not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get('chainId') || '195';
  const fromToken =
    searchParams.get('fromToken') ||
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // native OKB
  const toToken =
    searchParams.get('toToken') ||
    '0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c'; // USDT on X Layer
  const amount =
    searchParams.get('amount') || '1000000000000000000'; // 1 OKB

  const queryString = `chainId=${chainId}&fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}`;
  const requestPath = `/api/v5/dex/aggregator/quote?${queryString}`;

  const timestamp = new Date().toISOString();
  const sign = signRequest(timestamp, 'GET', requestPath, '', secretKey);

  try {
    const res = await fetch(`${OKX_DEX_BASE}${requestPath}`, {
      method: 'GET',
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('OKX DEX quote error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch quote from OKX DEX', detail: text },
        { status: 502 },
      );
    }

    const json = await res.json();

    return NextResponse.json(json, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('OKX DEX quote fetch error:', err);
    return NextResponse.json(
      { error: 'Internal error fetching DEX quote' },
      { status: 500 },
    );
  }
}
