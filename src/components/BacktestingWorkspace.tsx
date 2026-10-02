import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { motion } from 'motion/react';
import { chatCompletion } from '../lib/ai';
import {
  tradingCommand,
  type BacktestResult,
  type BotParameters,
  type CandleCoverage,
  type OptimizationResult,
  type StrategyId,
  type TradingBot,
  type TradingDashboard,
} from '../lib/backtesting';
import type { AIConfig, SavedCoin } from '../types';

interface Props {
  coins: SavedCoin[];
  aiConfig: AIConfig;
  hidden: boolean;
}

interface BotDraft {
  name: string;
  mint: string;
  strategy: StrategyId;
  params: BotParameters;
}

const DEFAULT_PARAMS: BotParameters = {
  timeframe_minutes: 1,
  stake_pct: 10,
  commission_bps: 10,
  initial_cash: 1000,
  fast_period: 10,
  slow_period: 30,
  rsi_period: 14,
  oversold: 30,
  overbought: 70,
};

function localTimestamp(timestamp: number | null | undefined) {
  if (timestamp == null) return '—';
  return new Date(timestamp * 1000).toLocaleString();
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function draftMatchesBot(draft: BotDraft, bot: TradingBot) {
  const commonMatches = draft.name.trim() === bot.name
    && draft.mint.trim() === bot.mint
    && draft.strategy === bot.strategy
    && draft.params.timeframe_minutes === bot.params.timeframe_minutes
    && draft.params.stake_pct === bot.params.stake_pct
    && draft.params.commission_bps === bot.params.commission_bps
    && draft.params.initial_cash === bot.params.initial_cash;
  if (!commonMatches) return false;
  return draft.strategy === 'sma_crossover'
    ? draft.params.fast_period === bot.params.fast_period
      && draft.params.slow_period === bot.params.slow_period
    : draft.params.rsi_period === bot.params.rsi_period
      && draft.params.oversold === bot.params.oversold
      && draft.params.overbought === bot.params.overbought;
}

export function BacktestingWorkspace({ coins, aiConfig, hidden }: Props) {
  const [dashboard, setDashboard] = useState<TradingDashboard | null>(null);
  const [draft, setDraft] = useState<BotDraft>({
    name: 'My first strategy',
    mint: coins[0]?.id ?? '',
    strategy: 'sma_crossover',
    params: { ...DEFAULT_PARAMS },
  });
  const [activeBotId, setActiveBotId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [analysis, setAnalysis] = useState('');

  const activeBot = useMemo(
    () => activeBotId === '__new__'
      ? null
      : dashboard?.bots.find((bot) => bot.id === activeBotId) ?? null,
    [activeBotId, dashboard?.bots],
  );
  const activeCoverage = dashboard?.candle_coverage.find(
    (coverage) => coverage.mint === draft.mint,
  );
  const isDesktop = isTauri();

  const refresh = async () => {
    const current = await tradingCommand<TradingDashboard>('dashboard');
    setDashboard(current);
    setActiveBotId((selected) => current.bots.some((bot) => bot.id === selected)
      ? selected
      : current.bots[0]?.id ?? '');
  };

  useEffect(() => {
    if (!isDesktop || hidden) return;
    void refresh().catch((reason: unknown) => setError(messageFor(reason)));
  }, [hidden, isDesktop]);

  useEffect(() => {
    if (!draft.mint && coins[0]) {
      setDraft((current) => ({ ...current, mint: coins[0].id }));
    }
  }, [coins, draft.mint]);

  useEffect(() => {
    if (!activeBot) return;
    setDraft({
      name: activeBot.name,
      mint: activeBot.mint,
      strategy: activeBot.strategy,
      params: { ...DEFAULT_PARAMS, ...activeBot.params },
    });
  }, [activeBot]);

  const runBusyAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  };

  const saveBot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runBusyAction(async () => {
      const saved = await tradingCommand<TradingBot>('save_bot', {
        id: activeBot?.id,
        ...draft,
      });
      await refresh();
      setActiveBotId(saved.id);
      setNotice(`Saved ${saved.name} locally.`);
      setOptimization(null);
      setAnalysis('');
    });
  };

  const importCandles = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = '';
    void runBusyAction(async () => {
      if (!draft.mint.trim()) throw new Error('Choose a token mint before importing candles.');
      if (file.size > 40 * 1024 * 1024) throw new Error('CSV exceeds the 40 MB import safety limit.');
      const csv = await file.text();
      const result = await tradingCommand<{
        rows_received: number;
        candle_count: number;
        dashboard: TradingDashboard;
      }>('import_csv', { mint: draft.mint.trim(), source: file.name, csv });
      setDashboard(result.dashboard);
      setNotice(
        `Imported ${result.rows_received.toLocaleString()} rows. `
        + `${result.candle_count.toLocaleString()} one-minute candles are now stored for this mint.`,
      );
      setOptimization(null);
    });
  };

  const runBacktest = () => {
    if (!activeBot) {
      setError('Save a bot configuration before running a backtest.');
      return;
    }
    if (!draftMatchesBot(draft, activeBot)) {
      setError('Save your bot changes before optimizing so candidates match a versioned configuration.');
      return;
    }
    if (!draftMatchesBot(draft, activeBot)) {
      setError('Save your bot changes before running it so each result matches a versioned configuration.');
      return;
    }
    void runBusyAction(async () => {
      const result = await tradingCommand<BacktestResult>('run_backtest', { bot_id: activeBot.id });
      if (result.id) {
        await refresh();
        setNotice('Backtest completed and saved to your local database.');
      }
      setOptimization(null);
    });
  };

  const optimizeBot = () => {
    if (!activeBot) {
      setError('Save a bot configuration before optimizing it.');
      return;
    }
    void runBusyAction(async () => {
      const fast = activeBot.params.fast_period ?? 10;
      const slow = activeBot.params.slow_period ?? 30;
      const result = await tradingCommand<OptimizationResult>('optimize', {
        bot_id: activeBot.id,
        fast_periods: [...new Set([Math.max(2, fast - 4), fast, Math.min(500, fast + 4)])],
        slow_periods: [...new Set([Math.max(3, slow - 10), slow, Math.min(1000, slow + 10)])],
      });
      setOptimization(result);
      await refresh();
      setNotice(
        `${result.runs.length} parameter combinations tested. `
        + 'The suggested winner is not applied to your saved bot.',
      );
    });
  };

  const askAI = () => {
    if (!activeBot) {
      setError('Save a bot configuration before requesting an analysis.');
      return;
    }
    const latestRun = dashboard?.runs.find((run) => run.bot_id === activeBot.id);
    if (!latestRun) {
      setError('Run a backtest before asking AI to analyze its results.');
      return;
    }
      if (JSON.stringify(latestRun.bot_snapshot) !== JSON.stringify(activeBot)) {
        setError('The latest saved backtest used a different bot version. Run the current version before asking for an AI review.');
        return;
      }
    void runBusyAction(async () => {
      const result = await chatCompletion(aiConfig, [{
        id: crypto.randomUUID(),
        role: 'user',
        timestamp: Date.now(),
        content: [
          'Review this historical, local-only Backtrader result. Do not execute trades or change parameters.',
          'Call out data limitations, sample size, overfitting risks, costs, and drawdown. Treat the run as hypothetical, not a forecast.',
          `Bot configuration: ${JSON.stringify(activeBot)}`,
          `Backtest result: ${JSON.stringify(latestRun.result)}`,
        ].join('\n\n'),
      }]);
      await tradingCommand('save_ai_review', {
        bot_id: activeBot.id,
        backtest_run_id: latestRun.id,
        review_text: result,
      });
      await refresh();
      setAnalysis(result);
    });
  };

  const updateParam = (key: keyof BotParameters, value: number) => {
    setDraft((current) => ({ ...current, params: { ...current.params, [key]: value } }));
  };

  if (!isDesktop) {
    return (
      <motion.section id="panel-backtesting" className="settings-workspace trading-workspace" role="tabpanel"
        aria-labelledby="tab-backtesting" tabIndex={0} hidden={hidden}>
        <header className="settings-page-header">
          <h1>Solana Bots</h1>
          <p>Open the Tauri desktop app to access its private SQLite database and Python worker.</p>
        </header>
        <section className="panel trading-notice">
          <strong>Desktop app required</strong>
          <p>Backtest data is stored in the app's local data folder and is not sent to a web service.</p>
        </section>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="settings-workspace trading-workspace"
      id="panel-backtesting"
      role="tabpanel"
      aria-labelledby="tab-backtesting"
      tabIndex={0}
      hidden={hidden}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <header className="settings-page-header trading-page-header">
        <h1>Solana Bots</h1>
      </header>

      {error && <p className="trading-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="trading-feedback is-success" role="status">{notice}</p>}

      <div className="trading-workspace-grid">
        <section className="panel trading-card trading-editor">
          <div className="trading-card-heading">
            <div>
              <h2>Bot configuration</h2>
            </div>
            <span className="trading-state-pill">Local</span>
          </div>

          <form className="trading-form" onSubmit={saveBot}>
            <div className="form-field">
              <label htmlFor="bot-name">Bot name</label>
              <input id="bot-name" className="input" maxLength={80} required value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="bot-mint">Token</label>
              {coins.length ? (
                <select id="bot-mint" className="input" required value={draft.mint}
                  onChange={(event) => setDraft((current) => ({ ...current, mint: event.target.value }))}>
                  {coins.map((coin) => <option key={coin.id} value={coin.id}>{coin.symbol} · {coin.id}</option>)}
                </select>
              ) : (
                <input id="bot-mint" className="input" required value={draft.mint}
                  onChange={(event) => setDraft((current) => ({ ...current, mint: event.target.value }))} />
              )}
              <span className="field-hint">One bot is bound to one mint. This does not place orders.</span>
            </div>
            <div className="form-field">
              <label htmlFor="bot-strategy">Strategy template</label>
              <select id="bot-strategy" className="input" value={draft.strategy}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  strategy: event.target.value as StrategyId,
                }))}>
                <option value="sma_crossover">SMA crossover</option>
                <option value="rsi_reversion">RSI mean reversion</option>
              </select>
            </div>
            <div className="trading-fields-grid">
              <div className="form-field">
                <label htmlFor="bot-timeframe">Timeframe</label>
                <select id="bot-timeframe" className="input" value={draft.params.timeframe_minutes}
                  onChange={(event) => updateParam('timeframe_minutes', Number(event.target.value))}>
                  {[1, 5, 15, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="bot-position">Position size (%)</label>
                <input id="bot-position" className="input" type="number" min={1} max={100} required
                  value={draft.params.stake_pct}
                  onChange={(event) => updateParam('stake_pct', Number(event.target.value))} />
              </div>
            </div>
            {draft.strategy === 'sma_crossover' ? (
              <div className="trading-fields-grid">
                <div className="form-field">
                  <label htmlFor="bot-fast">Fast SMA period</label>
                  <input id="bot-fast" className="input" type="number" min={2} max={500} required
                    value={draft.params.fast_period}
                    onChange={(event) => updateParam('fast_period', Number(event.target.value))} />
                </div>
                <div className="form-field">
                  <label htmlFor="bot-slow">Slow SMA period</label>
                  <input id="bot-slow" className="input" type="number" min={3} max={1000} required
                    value={draft.params.slow_period}
                    onChange={(event) => updateParam('slow_period', Number(event.target.value))} />
                </div>
              </div>
            ) : (
              <div className="trading-fields-grid">
                <div className="form-field">
                  <label htmlFor="bot-rsi">RSI period</label>
                  <input id="bot-rsi" className="input" type="number" min={2} max={100} required
                    value={draft.params.rsi_period}
                    onChange={(event) => updateParam('rsi_period', Number(event.target.value))} />
                </div>
                <div className="form-field">
                  <label htmlFor="bot-oversold">Oversold level</label>
                  <input id="bot-oversold" className="input" type="number" min={1} max={49} required
                    value={draft.params.oversold}
                    onChange={(event) => updateParam('oversold', Number(event.target.value))} />
                </div>
                <div className="form-field">
                  <label htmlFor="bot-overbought">Overbought level</label>
                  <input id="bot-overbought" className="input" type="number" min={51} max={99} required
                    value={draft.params.overbought}
                    onChange={(event) => updateParam('overbought', Number(event.target.value))} />
                </div>
              </div>
            )}
            <div className="trading-fields-grid">
              <div className="form-field">
                <label htmlFor="bot-cash">Starting quote balance</label>
                <input id="bot-cash" className="input" type="number" min={1} max={1000000000} required
                  value={draft.params.initial_cash}
                  onChange={(event) => updateParam('initial_cash', Number(event.target.value))} />
              </div>
              <div className="form-field">
                <label htmlFor="bot-fees">Commission (bps)</label>
                <input id="bot-fees" className="input" type="number" min={0} max={500} required
                  value={draft.params.commission_bps}
                  onChange={(event) => updateParam('commission_bps', Number(event.target.value))} />
              </div>
            </div>
            <button className="btn btn-primary trading-wide-button" type="submit" disabled={busy}>
              Save local bot
            </button>
          </form>

          <div className="trading-import">
            <div>
              <h3>Import one-minute candles</h3>
              <p>CSV columns: timestamp, open, high, low, close, volume. UTC epoch seconds/milliseconds or ISO timestamps. Backtests currently model commission, not slippage.</p>
            </div>
            <label className="btn btn-secondary trading-wide-button" htmlFor="candle-csv">
              {busy ? 'Working…' : 'Choose OHLCV CSV'}
            </label>
            <input id="candle-csv" className="sr-only" type="file" accept=".csv,text/csv"
              disabled={busy || !draft.mint} onChange={importCandles} />
          </div>
        </section>

        <div className="trading-results-column">
          <section className="panel trading-card">
            <div className="trading-card-heading">
              <div>
                <h2>Data &amp; saved bots</h2>
              </div>
              <div className="trading-header-actions">
                <button type="button" className="text-button" disabled={busy} onClick={() => {
                  void runBusyAction(refresh);
                }}>Refresh</button>
                <button type="button" className="text-button" disabled={busy} onClick={() => {
                  setActiveBotId('__new__');
                  setDraft((current) => ({
                    name: 'New strategy',
                    mint: current.mint || coins[0]?.id || '',
                    strategy: 'sma_crossover',
                    params: { ...DEFAULT_PARAMS },
                  }));
                  setOptimization(null);
                  setAnalysis('');
                  setError('');
                  setNotice('');
                }}>New bot</button>
              </div>
            </div>
            {activeCoverage ? <CoverageCard coverage={activeCoverage}
              capacity={dashboard?.candle_capacity_per_mint ?? 100_000} /> : (
              <div className="trading-empty-state">
                <strong>No candles for this mint yet</strong>
                <span>Import authentic source data; missing candles are never fabricated.</span>
              </div>
            )}
            <div className="trading-bot-list" aria-label="Saved bots">
              {dashboard?.bots.length ? dashboard.bots.map((bot) => (
                <button key={bot.id} type="button"
                  className={`trading-bot-item${activeBot?.id === bot.id ? ' is-active' : ''}`}
                  aria-pressed={activeBot?.id === bot.id}
                  onClick={() => {
                    setActiveBotId(bot.id);
                    setDraft({
                      name: bot.name,
                      mint: bot.mint,
                      strategy: bot.strategy,
                      params: { ...DEFAULT_PARAMS, ...bot.params },
                    });
                    setAnalysis('');
                    setOptimization(null);
                  }}>
                  <span><strong>{bot.name}</strong><small>{bot.strategy.replace('_', ' ')} · v{bot.version_count}</small></span>
                  <span className="trading-bot-paper">PAPER</span>
                </button>
              )) : <p className="trading-muted">Save a strategy to add your first bot.</p>}
            </div>
          </section>

          <section className="panel trading-card">
            <div className="trading-card-heading">
              <div>
                <h2>Backtest desk</h2>
              </div>
              <span className="trading-state-pill">No live orders</span>
            </div>
            <p className="trading-copy">
              {activeBot ? `${activeBot.name} · ${activeBot.strategy.replace('_', ' ')} · ${activeBot.params.timeframe_minutes}m`
                : 'Save a strategy to run a backtest.'}
            </p>
            <div className="trading-action-row">
              <button className="btn btn-primary" type="button" disabled={busy || !activeBot} onClick={runBacktest}>
                {busy ? 'Running…' : 'Run backtest'}
              </button>
              <button className="btn btn-secondary" type="button"
                disabled={busy || !activeBot || activeBot.strategy !== 'sma_crossover'}
                onClick={optimizeBot}>Optimize SMA</button>
              <button className="btn btn-secondary" type="button" disabled={busy || !activeBot}
                onClick={askAI}>AI review latest run</button>
            </div>
            <div className="trading-run-list">
              {dashboard?.runs.filter((run) => !activeBot || run.bot_id === activeBot.id).length ? (
                dashboard.runs.filter((run) => !activeBot || run.bot_id === activeBot.id).map((run) => (
                  <BacktestSummary key={run.id} result={run.result} />
                ))
              ) : <p className="trading-empty-state">No saved results yet. Run the strategy on imported candles.</p>}
            </div>
            {optimization && (
              <div className="trading-optimization">
                <strong>Best tested configuration (not applied)</strong>
                <span>Fast {optimization.best.fast_period} / Slow {optimization.best.slow_period} · {optimization.best.return_pct.toFixed(2)}% return · {optimization.best.max_drawdown_pct.toFixed(2)}% max drawdown</span>
                <small>{optimization.runs.length} of {optimization.runs.length} bounded combinations · {optimization.objective}</small>
              </div>
            )}
            {dashboard?.optimizations
              .filter((saved) => !activeBot || saved.bot_id === activeBot.id)
              .slice(0, 3)
              .map((saved) => (
                <div className="trading-optimization" key={saved.id}>
                  <strong>Saved optimization · {localTimestamp(Date.parse(saved.created_at) / 1000)}</strong>
                  <span>Fast {saved.result.best.fast_period} / Slow {saved.result.best.slow_period} · {saved.result.best.return_pct.toFixed(2)}% return · {saved.result.runs.length} candidates</span>
                </div>
              ))}
            {analysis && (
              <div className="trading-ai-analysis">
                <strong>AI analysis · review only</strong>
                <p>{analysis}</p>
              </div>
            )}
            {dashboard?.ai_reviews
              .filter((review) => !activeBot || review.bot_id === activeBot.id)
              .filter((review) => review.review_text !== analysis)
              .slice(0, 3)
              .map((review) => (
                <div className="trading-ai-analysis" key={review.id}>
                  <strong>Saved AI review · {localTimestamp(Date.parse(review.created_at) / 1000)}</strong>
                  <p>{review.review_text}</p>
                </div>
              ))}
          </section>

          <section className="panel trading-deploy-card">
            <div>
              <h2>Live deployment is locked</h2>
              <p>Jupiter can provide swap routes, but an off-chain strategy runner is not an on-chain program. Live execution needs wallet-based signing, transaction previews, and explicit approval for each order.</p>
            </div>
            <button className="btn btn-secondary" type="button" disabled aria-disabled="true">
              Live trading unavailable
            </button>
          </section>
        </div>
      </div>
    </motion.section>
  );
}

function CoverageCard({ coverage, capacity }: { coverage: CandleCoverage; capacity: number }) {
  const percent = Math.min(100, (coverage.candle_count / capacity) * 100);
  return (
    <div className="trading-coverage">
      <div className="trading-coverage-heading">
        <strong>{coverage.candle_count.toLocaleString()} / {capacity.toLocaleString()}</strong>
        <span>1-minute candles</span>
      </div>
      <div className="trading-progress" role="progressbar" aria-label="Candle store capacity"
        aria-valuenow={coverage.candle_count} aria-valuemin={0} aria-valuemax={capacity}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>{localTimestamp(coverage.first_timestamp)} → {localTimestamp(coverage.last_timestamp)}</small>
      <small>Source: {coverage.sources || 'unrecorded'}</small>
    </div>
  );
}

function BacktestSummary({ result }: { result: BacktestResult }) {
  return (
    <article className="trading-run">
      <div className="trading-run-heading">
        <strong>{result.return_pct >= 0 ? '+' : ''}{result.return_pct.toFixed(2)}%</strong>
        <span>{result.candles_used.toLocaleString()} bars · {result.closed_trades} closed trades</span>
      </div>
      <dl>
        <div><dt>End balance</dt><dd>{result.ending_value.toFixed(2)}</dd></div>
        <div><dt>Max drawdown</dt><dd>{result.max_drawdown_pct.toFixed(2)}%</dd></div>
        <div><dt>Sharpe ratio</dt><dd>{result.sharpe_ratio?.toFixed(2) ?? 'N/A'}</dd></div>
        <div><dt>Period</dt><dd>{localTimestamp(result.first_timestamp)} – {localTimestamp(result.last_timestamp)}</dd></div>
      </dl>
    </article>
  );
}
