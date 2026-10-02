import type { CanvasWidget, SavedCoin } from '../types';
import { AnimatePresence, motion } from 'motion/react';
import { PriceChart } from './PriceChart';

interface Props {
  widgets: CanvasWidget[];
  setWidgets: React.Dispatch<React.SetStateAction<CanvasWidget[]>>;
  activeCoin: SavedCoin | null;
  price?: number;
}

export function CanvasBoard({ widgets, setWidgets, activeCoin, price }: Props) {
  return (
    <section className="market-workspace">
      <div className="widget-grid">
        <AnimatePresence initial={false}>
          {widgets.map((widget) => (
            <motion.article
              key={widget.id}
              layout
              className={`panel widget-card widget-span-${Math.min(widget.w, 3)} widget-row-${Math.min(widget.h, 2)}`}
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <div className="widget-heading">
                <div>
                  <h2>{widget.title}</h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${widget.title}`}
                  onClick={() => setWidgets((current) => current.filter((item) => item.id !== widget.id))}
                >
                  x
                </button>
              </div>
              <div className="widget-content">
                {widget.type === 'chart' && (
                  <PriceChart coin={activeCoin} />
                )}
                {widget.type === 'stats' && (
                  <div className="stats-list">
                    <StatRow label="Current price" value={price != null
                      ? `$${price < 0.01 ? price.toExponential(3) : price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                      : 'Waiting for price'} />
                    <StatRow label="Token address" value={activeCoin ? `${activeCoin.id.slice(0, 6)}…${activeCoin.id.slice(-4)}` : '—'} />
                    <StatRow label="Decimals" value={String(activeCoin?.decimals ?? '—')} />
                  </div>
                )}
                {widget.type === 'news' && (
                  <div className="signal-empty">
                    <span className="signal-indicator" aria-hidden="true" />
                    <div>
                      <strong>Connect a signal source</strong>
                      <p>Add an RSS or custom connection in Settings to bring market updates into this panel.</p>
                    </div>
                  </div>
                )}
                {widget.type === 'blank' && (
                  <div className="custom-view-empty">
                    <span aria-hidden="true">+</span>
                    <div>
                      <strong>Your view, your layout</strong>
                      <p>This space is ready for a custom widget or script output.</p>
                    </div>
                  </div>
                )}
                {widget.type === 'script-output' && (
                  <pre className="script-output">{widget.content || '// Script output will appear here.'}</pre>
                )}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span className="stat-value" title={value}>{value}</span>
    </div>
  );
}
