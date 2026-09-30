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
        padding: '6px 14px',
        margin: 8,
        marginBottom: 0,
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="font-display" style={{ fontSize: 18, letterSpacing: 1 }}>
          SOL<span style={{ color: 'var(--accent-green-bright)' }}>JUP</span>
        </span>
        <span className="text-muted" style={{ fontSize: 11 }}>
          Self-Optimizing TA Pipeline
        </span>
        {activeSymbol && (
          <span
            className="live-glow"
            style={{
              background: 'linear-gradient(90deg, rgba(33,207,70,0.25), transparent)',
              padding: '2px 10px',
              borderRadius: 4,
              border: '1px solid var(--accent-green)',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
            }}
          >
            {activeSymbol}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="text-muted" style={{ fontSize: 11 }}>{status}</span>
        <button className="btn btn-metal" onClick={onOpenSettings} style={{ fontSize: 12 }}>
          Settings
        </button>
      </div>
    </header>
  );
}
