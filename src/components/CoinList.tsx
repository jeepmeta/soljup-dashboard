import type { SavedCoin } from '../types';

interface Props {
  coins: SavedCoin[];
  prices: Record<string, number>;
  activeMint: string | null;
  onSelect: (mint: string) => void;
  onRemove: (mint: string) => void;
}

export function CoinList({ coins, prices, activeMint, onSelect, onRemove }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px 8px' }}>
      {coins.map((c, i) => {
        const price = prices[c.id];
        const idx = String(i + 1).padStart(2, '0');
        return (
          <div
            key={c.id}
            className={`coin-item ${activeMint === c.id ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-pixel)',
                fontSize: 7,
                color: activeMint === c.id ? 'var(--phosphor)' : 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {c.symbol.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: 8,
                    letterSpacing: '0.06em',
                    color: activeMint === c.id ? 'var(--phosphor)' : 'var(--text-primary)',
                  }}
                >
                  <span className="text-muted" style={{ fontSize: 7, marginRight: 4 }}>{idx}</span>
                  {c.symbol}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: price != null ? 'var(--phosphor)' : 'var(--text-dim)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {price != null
                    ? price < 0.01
                      ? price.toExponential(2)
                      : price.toLocaleString(undefined, { maximumFractionDigits: 6 })
                    : '—.—'}
                </span>
              </div>
              <div
                className="text-muted"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.name}
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 6px', fontSize: 7 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(c.id);
              }}
              title="Purge from watchlist"
            >
              X
            </button>
          </div>
        );
      })}
      {coins.length === 0 && (
        <div className="text-muted" style={{ padding: 16, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          // EMPTY BUFFER
          <br />
          PASTE MINT OR QUERY SYMBOL
        </div>
      )}
    </div>
  );
}
