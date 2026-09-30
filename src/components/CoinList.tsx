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
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 8px' }}>
      {coins.map((c) => {
        const price = prices[c.id];
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
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #622CA7, #2A4EBF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontFamily: 'var(--font-display)',
                flexShrink: 0,
                border: '1px solid var(--border)',
              }}
            >
              {c.symbol.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                <span className="font-display" style={{ fontSize: 13 }}>
                  {c.symbol}
                </span>
                <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  {price != null
                    ? price < 0.01
                      ? price.toExponential(2)
                      : price.toLocaleString(undefined, { maximumFractionDigits: 6 })
                    : '—'}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '2px 6px', fontSize: 10 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(c.id);
              }}
              title="Remove"
            >
              ×
            </button>
          </div>
        );
      })}
      {coins.length === 0 && (
        <div className="text-muted" style={{ padding: 16, textAlign: 'center', fontSize: 12 }}>
          Paste a mint or search a symbol to start building your list (up to 200).
        </div>
      )}
    </div>
  );
}
