import type { CanvasWidget, SavedCoin } from '../types';

interface Props {
  widgets: CanvasWidget[];
  setWidgets: React.Dispatch<React.SetStateAction<CanvasWidget[]>>;
  activeCoin: SavedCoin | null;
  price?: number;
}

export function CanvasBoard({ widgets, setWidgets, activeCoin, price }: Props) {
  const addBlank = () => {
    setWidgets((w) => [
      ...w,
      {
        id: crypto.randomUUID(),
        type: 'blank',
        title: `Canvas ${w.length + 1}`,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      },
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-display" style={{ fontSize: 15 }}>
          Open Canvases
          {activeCoin && (
            <span className="text-muted" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, marginLeft: 8 }}>
              · {activeCoin.symbol}
              {price != null && (
                <span className="text-green" style={{ marginLeft: 6 }}>
                  ${price < 0.01 ? price.toExponential(3) : price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              )}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-orange" style={{ fontSize: 11 }} onClick={addBlank}>
            + Blank Canvas
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: 'minmax(140px, 1fr)',
          gap: 8,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            className="panel pixel-frame"
            style={{
              gridColumn: `span ${Math.min(w.w, 3)}`,
              gridRow: `span ${w.h}`,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 120,
            }}
          >
            <div className="panel-header" style={{ fontSize: 13 }}>
              <span>{w.title}</span>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '1px 6px' }}
                onClick={() => setWidgets((prev) => prev.filter((x) => x.id !== w.id))}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, padding: 10, overflow: 'auto' }}>
              {w.type === 'chart' && (
                <div className="canvas-slot" style={{ height: '100%', minHeight: 100, borderStyle: 'solid' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-display text-cyan" style={{ fontSize: 14, marginBottom: 6 }}>
                      Chart · {activeCoin?.symbol ?? '—'}
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      Lightweight Charts / TradingView-style placeholder.
                      <br />
                      AI can request drawings (trendlines, H&S, Elliott waves) here.
                    </div>
                  </div>
                </div>
              )}
              {w.type === 'stats' && (
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <StatRow label="Price" value={price != null ? `$${price}` : '—'} />
                  <StatRow label="Mint" value={activeCoin?.id.slice(0, 8) + '…' || '—'} />
                  <StatRow label="Decimals" value={String(activeCoin?.decimals ?? '—')} />
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: '62%', background: 'linear-gradient(90deg, var(--accent-green), var(--accent-green-bright))' }} />
                  </div>
                  <span className="text-muted" style={{ fontSize: 10 }}>Liquidity / volume bars when data connected</span>
                </div>
              )}
              {w.type === 'news' && (
                <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
                  Filtered news / RSS / social feed will appear here.
                  <br />
                  Reliability scoring + noise filters are enforced by AI rules.
                  <br />
                  <span className="text-secondary">Add custom RSS / websocket in Settings → Connections.</span>
                </div>
              )}
              {w.type === 'blank' && (
                <div className="canvas-slot" style={{ height: '100%', minHeight: 80 }}>
                  Drop zone · script output · custom widget · AI-generated view
                </div>
              )}
              {w.type === 'script-output' && (
                <pre style={{ fontSize: 11, color: 'var(--accent-green-bright)', whiteSpace: 'pre-wrap' }}>
                  {w.content || '// script output'}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="text-muted">{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
