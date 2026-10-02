# SolJup Dashboard

Self-optimizing Solana & meme-coin technical analysis desktop app built with **Tauri 2 + React + TypeScript**.

Metallic / retro / high-contrast UI inspired by the provided SVG game-UI assets.

## Features (MVP skeleton)

- **Watchlist** — up to 200 Solana tokens / meme coins (paste mint or search via Jupiter Tokens API)
- **Jupiter integration** — prices, token search (add free API key from [developers.jup.ag](https://developers.jup.ag) for higher limits)
- **Open canvases** — chart / stats / news / blank widgets; add more freely
- **AI Analyst panel** — connect **LM Studio** (or any OpenAI-compatible endpoint) for:
  - Pattern recognition (H&S, cup-and-handle, Elliott, etc.)
  - Strategy & risk discussion
  - Teaching chart tools
  - Future hooks for AI-drawn levels
- **Doginal Dogs studio** — save a pixel-art sprite sheet locally, configure row-based animations and market-trigger rules, and preview the selected animation
- **AI Assistant workspace** — edit local `mcp.json`, create multiple YAML-front-matter skills with evals and references, store Python scripts for explicit AI context, and maintain a five-file RFC ruleset
- **Custom connections** — REST / WS / RSS placeholders in Settings
- **AI skills & rules** — editable in the AI Assistant workspace; injected into assistant prompts
- Local persistence of settings + watchlist
- **Backtesting & bots** — configure local SMA/RSI paper strategies, import source-backed one-minute OHLCV, and run bounded Backtrader simulations

## Local backtesting

The Solana Bots tab runs in the Tauri desktop app. Its SQLite database is created under the operating system's application-data directory; bot configurations, imported candles, and historical result snapshots stay on this machine.

Install the Python worker dependencies into the interpreter you want the desktop app to use:

```bash
python3 -m pip install -r requirements.txt
# Optional when Python is not on PATH or multiple environments are installed:
export SOLJUP_PYTHON=/absolute/path/to/python
```

The importer accepts CSV columns `timestamp,open,high,low,close,volume`; timestamps must be UTC epoch seconds/milliseconds or ISO timestamps with a timezone. It validates OHLCV values, upserts by mint and timestamp, and retains the newest 100,000 candles per mint. It does not fetch or fabricate historical prices: import data from a source you have independently verified. The number of candles available depends on that source.

Strategies can aggregate complete, contiguous one-minute candles into 5-, 15-, or 60-minute bars. The initial templates are SMA crossover and RSI mean reversion. Backtests account for configured commission but not slippage, liquidity, network fees, or live execution conditions. Optimization is capped at 50 combinations and reports candidates without changing the saved bot.

Live deployment is intentionally unavailable. The local strategy runner is not an on-chain Solana program, Jupiter is a swap-routing API, and this initial feature has no wallet-signing or transaction-approval flow. Never provide a seed phrase or private key to the app.

AI review is an explicit action: it sends the selected bot configuration and its latest result to the model endpoint configured in Settings, and stores the response and configuration snapshot locally. Recommendations are review-only; edit and save a new bot version yourself before running it again.

### Doginal Dogs studio

The Doginal Dogs tab accepts PNG and WebP sprite sheets up to 12 MB. Configure frame dimensions, animation rows, frame counts, frame rate, and looping in the animation editor. The trigger editor stores trend, volatility, and one-minute price-change conditions locally. Live rules are not evaluated until a verified one-minute market feed is connected; the Preview control is an explicit local animation test and does not invent market data. The AI Analyst panel shares the saved idle sprite as its small companion window. Sprite images and studio settings stay in this browser/app's IndexedDB.

### AI workspace files

The AI Assistant tab stores files under `ai-workspace/` inside the Tauri application-data folder:

- `mcp.json` — VS Code `servers` or `mcpServers` configuration. The editor stores configuration; it does not launch or invoke MCP servers.
- `skills/<skill>/SKILL.md` — YAML front-matter with required `name` and `description`, followed by instructions.
- `skills/<skill>/evals.md` and optional `skills/<skill>/references/*.md`.
- `scripts/*.py` — scripts are saved but never automatically executed. Choose one to include its code in assistant context.
- `rules/RFC-001.md` through `RFC-005.md` — the five-part guardrail set, included with assistant requests.

The selected skill, its eval/reference documents, selected script, and five RFC files are included in requests to the configured AI model. Review the destination and content before selecting these files for AI context. In browser preview, AI workspace data uses browser local storage; the desktop app writes Markdown, JSON, and Python files to disk.

## Quick start

```bash
cd soljup-dashboard
npm install --legacy-peer-deps
npm run tauri dev
# or frontend only:
npm run dev
```

### Prerequisites (Linux desktop build)

See https://tauri.app/start/prerequisites/ — needs `webkit2gtk`, `librsvg2`, etc.

### LM Studio

1. Load a model in LM Studio
2. Start the local server (default `http://localhost:1234`)
3. Open **Settings** in the app and confirm Base URL / model name

### Jupiter API key

Optional. Paste your free key in Settings → Jupiter API for better rate limits on price & search.

## Architecture notes

- `src/lib/jupiter.ts` — Jupiter REST client (price, search, quote stubs)
- `src/lib/ai.ts` — LM Studio / OpenAI-compatible chat + pattern hint extraction
- `src/components/*` — TopBar, CoinList, CanvasBoard, AIPanel, DoginalStudio, BacktestingWorkspace, SettingsWorkspace
- `python/backtest_worker.py` — local SQLite schema, candle import, bot validation, Backtrader execution
- `python/indicators.py` — deterministic indicators and complete-bucket OHLCV aggregation
- Guardrails (noise filter, no invented prices, teach-first TA) live in the default system prompt

## Roadmap ideas

- Real Lightweight Charts + drawing tools
- WebSocket price streams
- RSS / X / news reliability scoring
- Script runner sandbox + bot deploy helpers
- MCP server connections for AI tools
- Saved views & multi-chart workspaces
- On-chain portfolio via Jupiter Portfolio API

## License

MIT
