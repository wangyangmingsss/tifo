'use client';

import { useState, useEffect, useRef } from 'react';

interface OkbPriceResult {
  price: number | null;
  loading: boolean;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

let cachedPrice: number | null = null;
let cachedAt = 0;
let inflightPromise: Promise<number | null> | null = null;

async function fetchOkbPrice(): Promise<number | null> {
  const now = Date.now();
  if (cachedPrice !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedPrice;
  }

  // De-duplicate concurrent requests
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const res = await fetch('/api/okx-price');
      if (!res.ok) return cachedPrice;
      const json = await res.json();
      const p = parseFloat(json.price);
      if (!isNaN(p)) {
        cachedPrice = p;
        cachedAt = Date.now();
        return p;
      }
      return cachedPrice;
    } catch {
      return cachedPrice;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export function useOkbPrice(): OkbPriceResult {
  const [price, setPrice] = useState<number | null>(cachedPrice);
  const [loading, setLoading] = useState(cachedPrice === null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetchOkbPrice().then((p) => {
      if (mounted.current) {
        setPrice(p);
        setLoading(false);
      }
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  return { price, loading };
}
