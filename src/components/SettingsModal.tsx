import { useState } from 'react';
import type { AppSettings, ConnectionConfig } from '../types';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onChange, onClose }: Props) {
  const [local, setLocal] = useState(settings);
  const [newConn, setNewConn] = useState({ name: '', url: '', type: 'rest' as const });

  const save = () => {
    onChange(local);
    onClose();
  };

  const addConnection = () => {
    if (!newConn.name || !newConn.url) return;
    const c: ConnectionConfig = {
      id: crypto.randomUUID(),
      name: newConn.name,
      type: newConn.type,
      url: newConn.url,
      enabled: true,
    };
    setLocal((s) => ({ ...s, connections: [...s.connections, c] }));
    setNewConn({ name: '', url: '', type: 'rest' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: 520, maxHeight: '85vh', overflowY: 'auto', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>SYS.CFG</span>
          <button className="btn btn-ghost" onClick={onClose}>X</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <h3 className="font-display" style={{ fontSize: 9, marginBottom: 8, color: 'var(--phosphor)' }}>JUPITER.API</h3>
            <label className="text-muted" style={{ fontSize: 12, display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
              Free key · developers.jup.ag (optional)
            </label>
            <input
              className="input"
              type="password"
              placeholder="x-api-key…"
              value={local.jupiterApiKey || ''}
              onChange={(e) => setLocal({ ...local, jupiterApiKey: e.target.value })}
            />
            <label className="text-muted" style={{ fontSize: 12, display: 'block', margin: '10px 0 4px', fontFamily: 'var(--font-mono)' }}>
              SOLANA.RPC
            </label>
            <input
              className="input"
              value={local.rpcUrl}
              onChange={(e) => setLocal({ ...local, rpcUrl: e.target.value })}
            />
          </section>

          <section>
            <h3 className="font-display" style={{ fontSize: 9, marginBottom: 8, color: 'var(--cyan)' }}>AI.LINK / LM STUDIO</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="text-muted" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>BASE.URL</label>
                <input
                  className="input"
                  value={local.ai.baseUrl}
                  onChange={(e) => setLocal({ ...local, ai: { ...local.ai, baseUrl: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>MODEL</label>
                <input
                  className="input"
                  value={local.ai.model}
                  onChange={(e) => setLocal({ ...local, ai: { ...local.ai, model: e.target.value } })}
                />
              </div>
            </div>
            <label className="text-muted" style={{ fontSize: 12, display: 'block', margin: '8px 0 4px', fontFamily: 'var(--font-mono)' }}>
              SKILLS (comma-separated)
            </label>
            <input
              className="input"
              value={local.ai.skills.join(', ')}
              onChange={(e) =>
                setLocal({
                  ...local,
                  ai: { ...local.ai, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
                })
              }
            />
            <label className="text-muted" style={{ fontSize: 12, display: 'block', margin: '8px 0 4px', fontFamily: 'var(--font-mono)' }}>
              RULES (one per line)
            </label>
            <textarea
              className="input"
              rows={3}
              style={{ resize: 'vertical' }}
              value={local.ai.rules.join('\n')}
              onChange={(e) =>
                setLocal({
                  ...local,
                  ai: { ...local.ai, rules: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) },
                })
              }
            />
          </section>

          <section>
            <h3 className="font-display" style={{ fontSize: 9, marginBottom: 8, color: 'var(--amber)' }}>CUSTOM.LINKS</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                className="input"
                placeholder="NAME"
                value={newConn.name}
                onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="URL / WS"
                value={newConn.url}
                onChange={(e) => setNewConn({ ...newConn, url: e.target.value })}
              />
              <button className="btn btn-green" onClick={addConnection}>ADD</button>
            </div>
            {local.connections.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', fontFamily: 'var(--font-mono)' }}>
                <span>
                  {c.name} <span className="text-muted">({c.type})</span>
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 7 }}
                  onClick={() =>
                    setLocal({ ...local, connections: local.connections.filter((x) => x.id !== c.id) })
                  }
                >
                  PURGE
                </button>
              </div>
            ))}
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>ABORT</button>
            <button className="btn btn-green" onClick={save}>COMMIT</button>
          </div>
        </div>
      </div>
    </div>
  );
}
