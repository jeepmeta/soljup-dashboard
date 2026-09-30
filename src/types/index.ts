export interface TokenInfo {
  id: string; // mint address
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  liquidity?: number;
  isMeme?: boolean;
  tags?: string[];
}

export interface SavedCoin extends TokenInfo {
  notes?: string;
  addedAt: number;
  watchlist: boolean;
  customTags?: string[];
}

export interface ChartDrawing {
  id: string;
  type: 'trendline' | 'horizontal' | 'fib' | 'hs' | 'cuphandle' | 'elliot' | 'freehand' | 'text';
  points: { time: number; price: number }[];
  color: string;
  label?: string;
  createdBy: 'user' | 'ai';
  coinMint: string;
}

export interface CanvasWidget {
  id: string;
  type: 'chart' | 'script-output' | 'news' | 'stats' | 'custom' | 'blank';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
  content?: string;
}

export interface SavedView {
  id: string;
  name: string;
  coins: string[]; // mints
  widgets: CanvasWidget[];
  drawings: ChartDrawing[];
  createdAt: number;
  updatedAt: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  coinContext?: string; // mint
  attachments?: { type: string; data: unknown }[];
}

export interface AIConfig {
  provider: 'lmstudio' | 'openai' | 'custom';
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature: number;
  systemPrompt: string;
  skills: string[];
  rules: string[];
  mcpServers: { name: string; url: string; enabled: boolean }[];
  datasets: string[];
}

export interface ConnectionConfig {
  id: string;
  name: string;
  type: 'rest' | 'websocket' | 'rss' | 'custom';
  url: string;
  headers?: Record<string, string>;
  apiKey?: string;
  enabled: boolean;
}

export interface AppSettings {
  jupiterApiKey?: string;
  rpcUrl: string;
  ai: AIConfig;
  connections: ConnectionConfig[];
  maxWatchlist: number;
  theme: 'retro-metallic';
}

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string; // raw
  slippageBps?: number;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
  reliability?: number; // 0-1 filter score
}
