import { AnimatePresence, motion } from 'motion/react';
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
    <div className="coin-list">
      <AnimatePresence initial={false}>
        {coins.map((coin, index) => {
          const price = prices[coin.id];
          const isActive = activeMint === coin.id;
          return (
            <motion.div
              key={coin.id}
              className={`coin-row ${isActive ? 'is-active' : ''}`}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.2) }}
            >
              <button
                type="button"
                className="coin-item"
                aria-pressed={isActive}
                onClick={() => onSelect(coin.id)}
              >
                <span className="coin-avatar" aria-hidden="true">
                  {coin.logoURI
                    ? <img src={coin.logoURI} alt="" loading="lazy" />
                    : coin.symbol.slice(0, 2)}
                </span>
                <span className="coin-details">
                  <span className="coin-name-line">
                    <span className="coin-symbol">{coin.symbol}</span>
                    <span className={`coin-price ${price == null ? 'is-empty' : ''}`}>
                      {price != null
                        ? `$${price < 0.01
                          ? price.toExponential(2)
                          : price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                        : 'Price pending'}
                    </span>
                  </span>
                  <span className="coin-full-name" title={coin.name}>{coin.name}</span>
                </span>
              </button>
              <button
                type="button"
                className="coin-remove"
                onClick={() => onRemove(coin.id)}
                aria-label={`Remove ${coin.symbol} from watchlist`}
                title={`Remove ${coin.symbol}`}
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {coins.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-mark" aria-hidden="true">+</span>
          <strong>Your watchlist is clear</strong>
          <span>Add a token above to start tracking its price.</span>
        </div>
      )}
    </div>
  );
}
