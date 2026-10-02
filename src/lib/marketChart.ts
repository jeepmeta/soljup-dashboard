export type ChartRange = '1H' | '24H' | '7D';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Pool {
  id: string;
  attributes?: {
    reserve_in_usd?: string;
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
  };
}

interface PoolResponse {
  data?: Pool[];
}

interface OHLCVResponse {
  data?: {
    attributes?: {
      ohlcv_list?: unknown[][];
    };
  };
}

interface PoolSelection {
  address: string;
  tokenSide: 'base' | 'quote';
}

const API_BASE = 'https://api.geckoterminal.com/api/v2';
const poolCache = new Map<string, { selection: PoolSelection; expiresAt: number }>();
const candleCache = new Map<string, { candles: Candle[]; expiresAt: number }>();
const POOL_CACHE_MS = 10 * 60 * 1000;
const CANDLE_CACHE_MS = 50 * 1000;
const POOL_STORAGE_KEY = 'sjd-market-pools-v1';

const RANGE_CONFIG: Record<ChartRange, { timeframe: string; aggregate: number; limit: number }> = {
  '1H': { timeframe: 'minute', aggregate: 1, limit: 60 },
  '24H': { timeframe: 'minute', aggregate: 15, limit: 96 },
  '7D': { timeframe: 'hour', aggregate: 1, limit: 168 },
};

function isPoolSelection(value: unknown): value is PoolSelection {
  if (!value || typeof value !== 'object') return false;
  const selection = value as Partial<PoolSelection>;
  return (
    typeof selection.address === 'string' &&
    selection.address.length > 0 &&
    (selection.tokenSide === 'base' || selection.tokenSide === 'quote')
  );
}

function readStoredPools(): Record<string, unknown> {
  const stored = localStorage.getItem(POOL_STORAGE_KEY);
  if (!stored) return {};

  try {
    const parsed: unknown = JSON.parse(stored);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  localStorage.removeItem(POOL_STORAGE_KEY);
  return {};
}

function tokenAddress(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return id.startsWith('solana_') ? id.slice('solana_'.length) : id;
}

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Could not reach GeckoTerminal. Check the connection or wait briefly if market data is rate limited.');
    }
    throw error;
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Market data is rate limited. Try again in a moment.');
    }
    throw new Error(`Market data request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

async function findPool(mint: string, signal?: AbortSignal): Promise<PoolSelection> {
  const cached = poolCache.get(mint);
  if (cached && cached.expiresAt > Date.now()) return cached.selection;

  const storedPools = readStoredPools();
  const storedEntry = storedPools[mint];
  if (storedEntry && typeof storedEntry === 'object') {
    const entry = storedEntry as { selection?: unknown; expiresAt?: number };
    if (
      entry.expiresAt &&
      entry.expiresAt > Date.now() &&
      isPoolSelection(entry.selection)
    ) {
      poolCache.set(mint, { selection: entry.selection, expiresAt: entry.expiresAt });
      return entry.selection;
    }
  }

  const query = new URLSearchParams({
    page: '1',
    include: 'base_token,quote_token',
  });
  const response = await fetchJSON<PoolResponse>(
    `${API_BASE}/networks/solana/tokens/${encodeURIComponent(mint)}/pools?${query}`,
    signal,
  );
  const pools = (response.data ?? [])
    .map((pool) => {
      const base = tokenAddress(pool.relationships?.base_token?.data?.id);
      const quote = tokenAddress(pool.relationships?.quote_token?.data?.id);
      const tokenSide = base === mint ? 'base' : quote === mint ? 'quote' : undefined;
      const address = pool.id.startsWith('solana_') ? pool.id.slice('solana_'.length) : pool.id;
      return {
        address,
        tokenSide,
        reserve: Number(pool.attributes?.reserve_in_usd ?? 0),
      };
    })
    .filter((pool): pool is typeof pool & { tokenSide: 'base' | 'quote' } =>
      Boolean(pool.tokenSide && pool.address && Number.isFinite(pool.reserve) && pool.reserve > 0),
    )
    .sort((a, b) => b.reserve - a.reserve);

  const bestPool = pools[0];
  if (!bestPool) {
    throw new Error('No liquid market pool was found for this token.');
  }

  const selection = { address: bestPool.address, tokenSide: bestPool.tokenSide };
  const expiresAt = Date.now() + POOL_CACHE_MS;
  poolCache.set(mint, { selection, expiresAt });
  storedPools[mint] = { selection, expiresAt };
  localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(storedPools));
  return selection;
}

export async function getTokenCandles(
  mint: string,
  range: ChartRange,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const cacheKey = `${mint}:${range}`;
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.candles;

  const pool = await findPool(mint, signal);
  const config = RANGE_CONFIG[range];
  const query = new URLSearchParams({
    aggregate: String(config.aggregate),
    limit: String(config.limit),
    currency: 'usd',
    token: pool.tokenSide,
  });
  const response = await fetchJSON<OHLCVResponse>(
    `${API_BASE}/networks/solana/pools/${encodeURIComponent(pool.address)}/ohlcv/${config.timeframe}?${query}`,
    signal,
  );
  const rows = response.data?.attributes?.ohlcv_list ?? [];
  const candles = rows
    .map((row): Candle | undefined => {
      const [time, open, high, low, close, volume] = row.map(Number);
      if (
        !Number.isFinite(time) ||
        ![open, high, low, close, volume].every(Number.isFinite) ||
        open <= 0 ||
        high <= 0 ||
        low <= 0 ||
        close <= 0 ||
        volume < 0
      ) {
        return undefined;
      }
      return { time, open, high, low, close, volume };
    })
    .filter((candle): candle is Candle => candle !== undefined)
    .sort((a, b) => a.time - b.time);

  if (candles.length === 0) {
    throw new Error('No candle history is available for this token yet.');
  }

  candleCache.set(cacheKey, { candles, expiresAt: Date.now() + CANDLE_CACHE_MS });
  return candles;
}
