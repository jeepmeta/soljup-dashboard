import { useEffect, useMemo, useState } from 'react';
import { getTokenCandles, type Candle, type ChartRange } from '../lib/marketChart';
import type { SavedCoin } from '../types';

interface Props {
  coin: SavedCoin | null;
}

const RANGES: ChartRange[] = ['1H', '24H', '7D'];
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 300;
const PLOT = { left: 12, top: 12, right: 76, bottom: 34 };

function formatPrice(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  return `$${Number(value.toPrecision(5)).toString()}`;
}

function formatTime(timestamp: number, range: ChartRange): string {
  const date = new Date(timestamp * 1000);
  return range === '7D'
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatVolume(volume: number): string {
  return volume >= 1_000_000
    ? `$${(volume / 1_000_000).toFixed(1)}m`
    : volume >= 1_000
      ? `$${(volume / 1_000).toFixed(1)}k`
      : `$${volume.toFixed(0)}`;
}

function ChartPlot({ candles, range, symbol }: { candles: Candle[]; range: ChartRange; symbol: string }) {
  const plotWidth = VIEW_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = VIEW_HEIGHT - PLOT.top - PLOT.bottom;
  const minPrice = Math.min(...candles.map((candle) => candle.low));
  const maxPrice = Math.max(...candles.map((candle) => candle.high));
  const pricePadding = (maxPrice - minPrice) * 0.08 || maxPrice * 0.01;
  const lowerBound = Math.max(0, minPrice - pricePadding);
  const upperBound = maxPrice + pricePadding;
  const priceRange = upperBound - lowerBound || 1;
  const y = (price: number) => PLOT.top + ((upperBound - price) / priceRange) * plotHeight;
  const candleStep = plotWidth / candles.length;
  const bodyWidth = Math.max(1, Math.min(9, candleStep * 0.62));
  const latest = candles[candles.length - 1];
  const first = candles[0];
  const change = first.open > 0 ? ((latest.close - first.open) / first.open) * 100 : 0;
  const positive = latest.close >= first.open;
  const tickCount = 4;
  const xLabels = Array.from({ length: 5 }, (_, index) => {
    const candleIndex = Math.round((index * (candles.length - 1)) / 4);
    return { x: PLOT.left + candleIndex * candleStep + candleStep / 2, candle: candles[candleIndex] };
  });

  return (
    <>
      <div className="price-chart-summary">
        <div>
          <strong>{formatPrice(latest.close)}</strong>
          <span className={positive ? 'is-positive' : 'is-negative'}>
            {positive ? '+' : ''}{change.toFixed(2)}% <span>{range}</span>
          </span>
        </div>
        <span className="price-chart-volume">VOL {formatVolume(candles.reduce((sum, candle) => sum + candle.volume, 0))}</span>
      </div>
      <svg
        className="price-chart-plot"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${symbol} ${range} candlestick chart, latest price ${formatPrice(latest.close)}, ${change.toFixed(2)} percent change`}
      >
        {Array.from({ length: tickCount + 1 }, (_, index) => {
          const price = upperBound - (index / tickCount) * priceRange;
          const tickY = PLOT.top + (index / tickCount) * plotHeight;
          return (
            <g key={index}>
              <line className="price-chart-gridline" x1={PLOT.left} x2={PLOT.left + plotWidth} y1={tickY} y2={tickY} />
              <text className="price-chart-axis-label" x={VIEW_WIDTH - PLOT.right + 8} y={tickY + 4}>
                {formatPrice(price)}
              </text>
            </g>
          );
        })}
        {candles.map((candle, index) => {
          const centerX = PLOT.left + index * candleStep + candleStep / 2;
          const candleColor = candle.close >= candle.open ? '#8dffa4' : '#ff7d82';
          const bodyTop = y(Math.max(candle.open, candle.close));
          const bodyBottom = y(Math.min(candle.open, candle.close));
          return (
            <g key={candle.time}>
              <title>
                {new Date(candle.time * 1000).toLocaleString()} · O {formatPrice(candle.open)} · H {formatPrice(candle.high)} · L {formatPrice(candle.low)} · C {formatPrice(candle.close)} · Vol {formatVolume(candle.volume)}
              </title>
              <line
                x1={centerX}
                x2={centerX}
                y1={y(candle.high)}
                y2={y(candle.low)}
                stroke={candleColor}
                strokeWidth="1.5"
              />
              <rect
                x={centerX - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={Math.max(1, bodyBottom - bodyTop)}
                fill={candleColor}
              />
            </g>
          );
        })}
        <line
          className="price-chart-last-line"
          x1={PLOT.left}
          x2={PLOT.left + plotWidth}
          y1={y(latest.close)}
          y2={y(latest.close)}
        />
        <rect
          className="price-chart-last-label"
          x={VIEW_WIDTH - PLOT.right + 3}
          y={Math.max(PLOT.top, Math.min(PLOT.top + plotHeight - 20, y(latest.close) - 10))}
          width={PLOT.right - 7}
          height="20"
          rx="5"
        />
        <text
          className="price-chart-last-price"
          x={VIEW_WIDTH - PLOT.right + PLOT.right / 2}
          y={Math.max(PLOT.top + 14, Math.min(PLOT.top + plotHeight - 6, y(latest.close) + 4))}
          textAnchor="middle"
        >
          {formatPrice(latest.close)}
        </text>
        {xLabels.map(({ x: labelX, candle }, index) => (
          <text className="price-chart-time-label" key={`${candle.time}-${index}`} x={labelX} y={VIEW_HEIGHT - 8} textAnchor="middle">
            {formatTime(candle.time, range)}
          </text>
        ))}
      </svg>
      <span className="sr-only">
        Latest candle opened at {formatPrice(latest.open)}, reached {formatPrice(latest.high)} high and {formatPrice(latest.low)} low, and closed at {formatPrice(latest.close)}.
      </span>
    </>
  );
}

export function PriceChart({ coin }: Props) {
  const [range, setRange] = useState<ChartRange>('24H');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!coin) {
      setCandles([]);
      setError(null);
      setLoading(false);
      return;
    }

    let disposed = false;
    let controller: AbortController | undefined;
    setCandles([]);
    setError(null);
    setLoading(true);

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const nextCandles = await getTokenCandles(coin.id, range, controller.signal);
        if (disposed) return;
        setCandles(nextCandles);
        setError(null);
      } catch (cause) {
        if (disposed || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!disposed && !controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    const refreshId = window.setInterval(() => void load(), 60_000);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(refreshId);
    };
  }, [coin?.id, range, refreshKey]);

  const retryButton = (
    <button className="price-chart-retry" type="button" onClick={() => setRefreshKey((key) => key + 1)}>
      Retry
    </button>
  );

  const poolVolume = useMemo(
    () => candles.reduce((sum, candle) => sum + candle.volume, 0),
    [candles],
  );

  return (
    <div className="price-chart">
      <div className="price-chart-toolbar">
        <div className="price-chart-source"><span aria-hidden="true" /> LIVE · GECKOTERMINAL</div>
        <div className="price-chart-ranges" role="group" aria-label="Chart time range">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={range === item}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {!coin ? (
        <div className="price-chart-state">Select a token from the watchlist to view its market chart.</div>
      ) : loading && candles.length === 0 ? (
        <div className="price-chart-state" role="status">Loading {coin.symbol} candle history…</div>
      ) : candles.length > 0 ? (
        <>
          {error && (
            <div className="price-chart-error" role="status">
              <span>{error} Showing the last available candles.</span>
              {retryButton}
            </div>
          )}
          <ChartPlot candles={candles} range={range} symbol={coin.symbol} />
          <span className="sr-only">Chart volume total: {formatVolume(poolVolume)}.</span>
        </>
      ) : (
        <div className="price-chart-state" role="status">
          <span>{error ?? 'No market candle data is available yet.'}</span>
          {retryButton}
        </div>
      )}
    </div>
  );
}
