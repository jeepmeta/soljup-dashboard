import { useState, useEffect, useCallback } from 'react';
import './styles/theme.css';
import { CoinList } from './components/CoinList';
import { AIPanel } from './components/AIPanel';
import { CanvasBoard } from './components/CanvasBoard';
import { TopBar } from './components/TopBar';
import { SettingsModal } from './components/SettingsModal';
import { setJupiterApiKey, DEMO_MEME_COINS, getPrices, searchTokens } from './lib/jupiter';
import { DEFAULT_AI_CONFIG } from './lib/ai';
import type { SavedCoin, AppSettings, AIMessage, CanvasWidget } from './types';

const STORAGE_KEY = 'sjd-settings-v1';
const WATCHLIST_KEY = 'sjd-watchlist-v1';

function defaultSettings(): AppSettings {
  return {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    ai: { ...DEFAULT_AI_CONFIG },
    connections: [],
    maxWatchlist: 200,
    theme: 'retro-metallic',
  };
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {}
  return defaultSettings();
}

function loadWatchlist(): SavedCoin[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_MEME_COINS.map((c) => ({
    ...c,
    addedAt: Date.now(),
    watchlist: true,
    isMeme: true,
  }));
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [coins, setCoins] = useState<SavedCoin[]>(loadWatchlist);
  const [activeMint, setActiveMint] = useState<string | null>(coins[0]?.id ?? null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [widgets, setWidgets] = useState<CanvasWidget[]>([
    { id: 'w1', type: 'chart', title: 'Price Chart', x: 0, y: 0, w: 2, h: 2 },
    { id: 'w2', type: 'stats', title: 'Key Stats', x: 2, y: 0, w: 1, h: 1 },
    { id: 'w3', type: 'news', title: 'Filtered News', x: 2, y: 1, w: 1, h: 1 },
    { id: 'w4', type: 'blank', title: 'Open Canvas', x: 0, y: 2, w: 3, h: 1 },
  ]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setJupiterApiKey(settings.jupiterApiKey);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(coins));
  }, [coins]);

  useEffect(() => {
    const mints = coins.map((c) => c.id).slice(0, 50);
    if (!mints.length) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await getPrices(mints);
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const [mint, v] of Object.entries(data)) {
          if (v?.usdPrice != null) map[mint] = v.usdPrice;
        }
        setPrices(map);
        setStatus(`Prices updated · ${new Date().toLocaleTimeString()}`);
      } catch {
        setStatus('Price feed limited — add Jupiter API key in Settings');
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coins]);

  const activeCoin = coins.find((c) => c.id === activeMint) ?? null;

  const addCoin = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setStatus('Searching…');
      const results = await searchTokens(query.trim());
      const hit = results[0];
      if (!hit) {
        if (query.length >= 32) {
          const newCoin: SavedCoin = {
            id: query,
            symbol: query.slice(0, 6).toUpperCase(),
            name: 'Custom',
            decimals: 9,
            addedAt: Date.now(),
            watchlist: true,
            isMeme: true,
          };
          setCoins((prev) => {
            if (prev.some((c) => c.id === newCoin.id)) return prev;
            if (prev.length >= settings.maxWatchlist) return prev;
            return [newCoin, ...prev];
          });
          setActiveMint(newCoin.id);
          setStatus('Added by mint');
        } else {
          setStatus('No token found');
        }
        return;
      }
      const mint = hit.address || hit.id || hit.mint;
      const newCoin: SavedCoin = {
        id: mint,
        symbol: hit.symbol || '???',
        name: hit.name || hit.symbol || 'Unknown',
        decimals: hit.decimals ?? 9,
        logoURI: hit.logoURI || hit.icon,
        addedAt: Date.now(),
        watchlist: true,
        isMeme: true,
      };
      setCoins((prev) => {
        if (prev.some((c) => c.id === mint)) return prev;
        if (prev.length >= settings.maxWatchlist) return prev;
        return [newCoin, ...prev];
      });
      setActiveMint(mint);
      setSearchQuery('');
      setStatus(`Added ${newCoin.symbol}`);
    },
    [settings.maxWatchlist]
  );

  const removeCoin = (mint: string) => {
    setCoins((prev) => prev.filter((c) => c.id !== mint));
    if (activeMint === mint) setActiveMint(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        status={status}
        onOpenSettings={() => setShowSettings(true)}
        activeSymbol={activeCoin?.symbol}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 8, padding: 8 }}>
        <aside style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="panel-header">
              <span>Watchlist</span>
              <span className="text-muted" style={{ fontSize: 11 }}>
                {coins.length}/{settings.maxWatchlist}
              </span>
            </div>
            <div style={{ padding: 8 }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCoin(searchQuery);
                }}
                style={{ display: 'flex', gap: 6 }}
              >
                <input
                  className="input"
                  placeholder="Mint / symbol / name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-green" style={{ padding: '6px 10px' }}>
                  +
                </button>
              </form>
            </div>
            <CoinList
              coins={coins}
              prices={prices}
              activeMint={activeMint}
              onSelect={setActiveMint}
              onRemove={removeCoin}
            />
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CanvasBoard
            widgets={widgets}
            setWidgets={setWidgets}
            activeCoin={activeCoin}
            price={activeMint ? prices[activeMint] : undefined}
          />
        </main>

        <aside style={{ width: 340, flexShrink: 0 }}>
          <AIPanel
            config={settings.ai}
            messages={messages}
            setMessages={setMessages}
            activeCoin={activeCoin}
            onStatus={setStatus}
          />
        </aside>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
