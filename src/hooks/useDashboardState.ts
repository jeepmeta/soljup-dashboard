import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_AI_CONFIG } from '../lib/ai';
import type { AIContext } from '../lib/aiWorkspace';
import { DEMO_MEME_COINS, getPrices, searchTokens, setJupiterApiKey } from '../lib/jupiter';
import type { AIMessage, AppSettings, CanvasWidget, SavedCoin } from '../types';

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
  return DEMO_MEME_COINS.map((coin) => ({
    ...coin,
    addedAt: Date.now(),
    watchlist: true,
    isMeme: true,
  }));
}

export function useDashboardState() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [coins, setCoins] = useState<SavedCoin[]>(loadWatchlist);
  const [activeMint, setActiveMint] = useState<string | null>(coins[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [aiContext, setAIContext] = useState<AIContext>({ skill: null, script: null, rules: [] });
  const [widgets, setWidgets] = useState<CanvasWidget[]>([
    { id: 'w1', type: 'chart', title: 'Price chart', x: 0, y: 0, w: 2, h: 2 },
    { id: 'w2', type: 'stats', title: 'Token details', x: 2, y: 0, w: 1, h: 1 },
    { id: 'w3', type: 'news', title: 'Market signals', x: 2, y: 1, w: 1, h: 1 },
    { id: 'w4', type: 'blank', title: 'Custom view', x: 0, y: 2, w: 3, h: 1 },
  ]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('Ready');

  const aiRuntimeConfig = useMemo(() => ({
    ...settings.ai,
    systemPrompt: [
      settings.ai.systemPrompt,
      ...(aiContext.skill ? [
        `Active skill: ${aiContext.skill.name}`,
        aiContext.skill.skill_md,
        `Skill evaluations:\n${aiContext.skill.evals_md}`,
        ...aiContext.skill.references.map((reference) => `Reference ${reference.filename}:\n${reference.content}`),
      ] : []),
      ...(aiContext.script ? [
        `User-selected Python script for analysis only (${aiContext.script.name}; never execute it):\n${aiContext.script.code}`,
      ] : []),
    ].filter(Boolean).join('\n\n'),
    skills: [
      ...settings.ai.skills,
      ...(aiContext.skill ? [aiContext.skill.name] : []),
      ...(aiContext.script ? [`script:${aiContext.script.name}`] : []),
    ],
    rules: [
      ...settings.ai.rules,
      ...aiContext.rules.map((rule) => `${rule.filename}\n${rule.content}`),
    ],
  }), [aiContext, settings.ai]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setJupiterApiKey(settings.jupiterApiKey);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(coins));
  }, [coins]);

  useEffect(() => {
    const mints = coins.map((coin) => coin.id).slice(0, 50);
    if (!mints.length) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await getPrices(mints);
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const [mint, value] of Object.entries(data)) {
          if (value?.usdPrice != null) map[mint] = value.usdPrice;
        }
        setPrices(map);
        setStatus(`Prices updated · ${new Date().toLocaleTimeString()}`);
      } catch {
        setStatus('Price data limited · Check API key in Settings');
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [coins]);

  const activeCoin = coins.find((coin) => coin.id === activeMint) ?? null;

  const addCoin = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setStatus('Searching tokens…');
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
        setCoins((current) => {
          if (current.some((coin) => coin.id === newCoin.id)) return current;
          if (current.length >= settings.maxWatchlist) return current;
          return [newCoin, ...current];
        });
        setActiveMint(newCoin.id);
        setStatus('Token added');
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
    setCoins((current) => {
      if (current.some((coin) => coin.id === mint)) return current;
      if (current.length >= settings.maxWatchlist) return current;
      return [newCoin, ...current];
    });
    setActiveMint(mint);
    setSearchQuery('');
    setStatus(`${newCoin.symbol} added to watchlist`);
  }, [settings.maxWatchlist]);

  const removeCoin = useCallback((mint: string) => {
    setCoins((current) => current.filter((coin) => coin.id !== mint));
    setActiveMint((current) => current === mint ? null : current);
  }, []);

  return {
    settings,
    setSettings,
    coins,
    setCoins,
    activeMint,
    setActiveMint,
    searchQuery,
    setSearchQuery,
    messages,
    setMessages,
    setAIContext,
    widgets,
    setWidgets,
    prices,
    status,
    setStatus,
    aiRuntimeConfig,
    activeCoin,
    addCoin,
    removeCoin,
  };
}