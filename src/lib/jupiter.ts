/**
 * Jupiter API client (keyless + keyed)
 * Base: https://api.jup.ag
 * Get free key at https://developers.jup.ag
 */

const BASE = 'https://api.jup.ag';
const PRICE_BASE = 'https://api.jup.ag/price/v3';
const TOKENS_BASE = 'https://api.jup.ag/tokens/v2';

let apiKey: string | undefined;

export function setJupiterApiKey(key: string | undefined) {
  apiKey = key?.trim() || undefined;
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) h['x-api-key'] = apiKey;
  return h;
}

async function jupFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') || 10);
    throw { code: 'RATE_LIMITED', retryAfter: retry };
  }
  if (!res.ok) {
    const text = await res.text();
    let body: any = { message: text };
    try { body = JSON.parse(text); } catch {}
    throw { status: res.status, ...body };
  }
  return res.json();
}

/** Price lookup (supports comma-separated mints) */
export async function getPrices(mints: string[]): Promise<Record<string, { usdPrice?: number; priceChange24h?: number }>> {
  if (!mints.length) return {};
  const ids = mints.slice(0, 100).join(',');
  try {
    return await jupFetch(`${PRICE_BASE}?ids=${ids}`);
  } catch (e) {
    console.warn('Price fetch failed', e);
    return {};
  }
}

/** Token search / metadata */
export async function searchTokens(query: string): Promise<any[]> {
  try {
    const data = await jupFetch<any>(`${TOKENS_BASE}/search?query=${encodeURIComponent(query)}`);
    return Array.isArray(data) ? data : data?.tokens || data?.data || [];
  } catch (e) {
    console.warn('Token search failed', e);
    return [];
  }
}

/** Get verified tokens list (popular) */
export async function getVerifiedTokens(): Promise<any[]> {
  try {
    const data = await jupFetch<any>(`${TOKENS_BASE}/tag?query=verified`);
    return Array.isArray(data) ? data : data?.tokens || [];
  } catch {
    return [];
  }
}

/** Quote for swap (requires key for production rate) */
export async function getQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}): Promise<any> {
  const q = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps ?? 50),
  });
  return jupFetch(`/swap/v1/quote?${q}`);
}

/** Portfolio positions (wallet) */
export async function getPortfolio(address: string): Promise<any> {
  return jupFetch(`/portfolio/v1/positions/${address}`);
}

/** Simple SOL mint constant */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/** Demo / fallback meme coins for offline / first-run */
export const DEMO_MEME_COINS = [
  { id: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk', decimals: 5 },
  { id: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', name: 'dogwifhat', decimals: 6 },
  { id: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', symbol: 'POPCAT', name: 'Popcat', decimals: 9 },
  { id: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5', symbol: 'MEW', name: 'cat in a dogs world', decimals: 5 },
  { id: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', symbol: 'BOME', name: 'BOOK OF MEME', decimals: 6 },
];
