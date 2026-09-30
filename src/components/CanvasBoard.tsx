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
        title: `CANVAS.${String(w.length + 1).padStart(2, '0')}`,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      },
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-display" style={{ fontSize: 9, color: 'var(--cyan)' }}>
          OPEN.CANVASES
          {activeCoin && (
            <span
              className="text-muted"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 14, marginLeft: 10, letterSpacing: '0.04em' }}
            >
              · {activeCoin.symbol}
              {price != null && (
                <span className="text-green" style={{ marginLeft: 8 }}>
                  ${price < 0.01 ? price.toExponential(3) : price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              )}
            </span>
          )}
        </span>
        <button className="btn btn-orange" onClick={addBlank}>
          + SLOT
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: 'minmax(140px, 1fr)',
          gap: 6,
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
            <div className="panel-header" style={{ fontSize: 8 }}>
              <span>{w.title}</span>
              <button
                className="btn btn-ghost"
                style={{ padding: '2px 6px', fontSize: 7 }}
                onClick={() => setWidgets((prev) => prev.filter((x) => x.id !== w.id))}
              >
                X
              </button>
            </div>
            <div style={{ flex: 1, padding: 10, overflow: 'auto' }}>
              {w.type === 'chart' && (
                <div className="canvas-slot" style={{ height: '100%', minHeight: 100, borderStyle: 'solid' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="font-display text-cyan" style={{ fontSize: 9, marginBottom: 8 }}>
                      CHART · {activeCoin?.symbol ?? 'NO.TGT'}
                    </div>
                    <div className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      PRICE FEED / DRAWING LAYER
                      <br />
                      AI → TREND · H&amp;S · ELLIOTT HOOKS
                    </div>
                  </div>
                </div>
              )}
              {w.type === 'stats' && (
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-mono)' }}>
                  <StatRow label="PX" value={price != null ? `$${price}` : '—.—'} />
                  <StatRow label="MINT" value={activeCoin?.id.slice(0, 8) + '…' || '—'} />
                  <StatRow label="DEC" value={String(activeCoin?.decimals ?? '—')} />
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: '62%' }} />
                  </div>
                  <span className="text-muted" style={{ fontSize: 12 }}>LIQ / VOL METERS — LINK DATA</span>
                </div>
              )}
              {w.type === 'news' && (
                <div className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.45 }}>
                  SIG.INTEL BUFFER
                  <br />
                  RSS / SOCIAL / ON-CHAIN ALERTS
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    RELIABILITY FILTER ACTIVE · CFG CONNECTIONS
                  </span>
                </div>
              )}
              {w.type === 'blank' && (
                <div className="canvas-slot" style={{ height: '100%', minHeight: 80 }}>
                  DROP · SCRIPT.OUT · WIDGET · AI.VIEW
                </div>
              )}
              {w.type === 'script-output' && (
                <pre style={{ fontSize: 12, color: 'var(--phosphor)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
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
      <span style={{ color: 'var(--phosphor)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
