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
- **Custom connections** — REST / WS / RSS placeholders in Settings
- **Skills & rules** — editable in Settings; injected into system prompt
- Local persistence of settings + watchlist

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
- `src/components/*` — TopBar, CoinList, CanvasBoard, AIPanel, SettingsModal
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
