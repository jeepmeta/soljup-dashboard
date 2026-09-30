interface Props {
  status: string;
  activeSymbol?: string;
  onOpenSettings: () => void;
}

export function TopBar({ status, activeSymbol, onOpenSettings }: Props) {
  return (
    <header
      className="panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        margin: 8,
        marginBottom: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="font-display" style={{ fontSize: 10, color: 'var(--phosphor)' }}>
          <span className="led" />
          SOLJUP<span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>//</span>
          <span style={{ color: 'var(--cyan)' }}>TA-PIPE</span>
        </span>
        <span className="text-muted" style={{ fontFamily: 'var(--font-hud)', fontSize: 14 }}>
          RETRO-FUTURIST MARKET HUD
        </span>
        {activeSymbol && (
          <span
            className="live-glow"
            style={{
              padding: '3px 10px',
              border: '1px solid var(--phosphor)',
              fontFamily: 'var(--font-pixel)',
              fontSize: 9,
              letterSpacing: '0.1em',
              background: 'rgba(51,255,102,0.06)',
            }}
          >
            TGT::{activeSymbol}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="text-muted"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 13, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {status}
        </span>
        <button className="btn btn-metal" onClick={onOpenSettings}>
          SYS.CFG
        </button>
      </div>
    </header>
  );
}
