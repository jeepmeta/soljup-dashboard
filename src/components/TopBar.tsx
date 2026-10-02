import { motion } from 'motion/react';

interface Props {
  status: string;
  activeSymbol?: string;
}

export function TopBar({ status, activeSymbol }: Props) {
  const statusClass = /limited|fail|not found/i.test(status)
    ? 'is-warning'
    : /search|analyz/i.test(status)
      ? 'is-busy'
      : '';

  return (
    <motion.header
      className="topbar panel"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">S</span>
        <div>
          <div className="brand-name">SolJup</div>
          <div className="brand-caption">Solana market workspace</div>
        </div>
      </div>
      <div className="topbar-meta">
        {activeSymbol && <span className="active-token-pill">{activeSymbol}</span>}
        <span className="connection-status">
          <span className={`status-dot ${statusClass}`} aria-hidden="true" />
          <span>{status}</span>
        </span>
      </div>
    </motion.header>
  );
}
