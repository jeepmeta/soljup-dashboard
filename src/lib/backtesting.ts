import { invoke } from '@tauri-apps/api/core';

export type StrategyId = 'sma_crossover' | 'rsi_reversion';

export interface BotParameters {
  timeframe_minutes: number;
  stake_pct: number;
  commission_bps: number;
  initial_cash: number;
  fast_period?: number;
  slow_period?: number;
  rsi_period?: number;
  oversold?: number;
  overbought?: number;
}

export interface TradingBot {
  id: string;
  name: string;
  mint: string;
  strategy: StrategyId;
  params: BotParameters;
  updated_at: string;
  version_count: number;
}

export interface CandleCoverage {
  mint: string;
  candle_count: number;
  first_timestamp: number;
  last_timestamp: number;
  sources: string;
}

export interface BacktestResult {
  id?: string;
  bot_id?: string;
  created_at?: string;
  starting_value: number;
  ending_value: number;
  return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number | null;
  closed_trades: number;
  candles_used: number;
  timeframe_minutes: number;
  first_timestamp: number;
  last_timestamp: number;
}

export interface BacktestRun {
  id: string;
  bot_id: string;
  created_at: string;
  bot_snapshot: TradingBot;
  result: BacktestResult;
}

export interface TradingDashboard {
  database_path: string;
  candle_capacity_per_mint: number;
  bots: TradingBot[];
  candle_coverage: CandleCoverage[];
  runs: BacktestRun[];
  ai_reviews: { id: string; bot_id: string; created_at: string; review_text: string }[];
  optimizations: SavedOptimization[];
}

export interface OptimizationRun {
  fast_period: number;
  slow_period: number;
  return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number | null;
  candles_used: number;
}

export interface OptimizationResult {
  runs: OptimizationRun[];
  best: OptimizationRun;
  objective: string;
}

export interface SavedOptimization {
  id: string;
  bot_id: string;
  created_at: string;
  result: OptimizationResult;
  bot_snapshot: TradingBot;
}

export type TradingAction =
  | 'dashboard'
  | 'save_bot'
  | 'import_csv'
  | 'run_backtest'
  | 'optimize'
  | 'save_ai_review'
  | 'get_ai_workspace'
  | 'save_mcp_config'
  | 'save_skill'
  | 'delete_skill'
  | 'save_python_script'
  | 'delete_python_script'
  | 'save_ai_rules';

export function tradingCommand<T>(action: TradingAction, payload: object = {}) {
  return invoke<T>('trading_command', { action, payload });
}
