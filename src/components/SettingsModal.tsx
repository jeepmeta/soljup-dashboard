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
        background: 'rgba(0,0,0,0.65)',
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
          <span>Settings</span>
          <button className="btn btn-ghost" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <h3 className="font-display" style={{ fontSize: 14, marginBottom: 8 }}>Jupiter API</h3>
            <label className="text-muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Free API key from developers.jup.ag (optional — improves rate limits)
            </label>
            <input
              className="input"
              type="password"
              placeholder="x-api-key…"
              value={local.jupiterApiKey || ''}
              onChange={(e) => setLocal({ ...local, jupiterApiKey: e.target.value })}
            />
            <label className="text-muted" style={{ fontSize: 11, display: 'block', margin: '10px 0 4px' }}>
              Solana RPC
            </label>
            <input
              className="input"
              value={local.rpcUrl}
              onChange={(e) => setLocal({ ...local, rpcUrl: e.target.value })}
            />
          </section>

          <section>
            <h3 className="font-display" style={{ fontSize: 14, marginBottom: 8 }}>AI / LM Studio</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="text-muted" style={{ fontSize: 11 }}>Base URL</label>
                <input
                  className="input"
                  value={local.ai.baseUrl}
                  onChange={(e) => setLocal({ ...local, ai: { ...local.ai, baseUrl: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: 11 }}>Model</label>
                <input
                  className="input"
                  value={local.ai.model}
                  onChange={(e) => setLocal({ ...local, ai: { ...local.ai, model: e.target.value } })}
                />
              </div>
            </div>
            <label className="text-muted" style={{ fontSize: 11, display: 'block', margin: '8px 0 4px' }}>
              Skills (comma-separated)
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
            <label className="text-muted" style={{ fontSize: 11, display: 'block', margin: '8px 0 4px' }}>
              Custom rules (one per line)
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
            <h3 className="font-display" style={{ fontSize: 14, marginBottom: 8 }}>Custom Connections</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                className="input"
                placeholder="Name"
                value={newConn.name}
                onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="URL / WS"
                value={newConn.url}
                onChange={(e) => setNewConn({ ...newConn, url: e.target.value })}
              />
              <button className="btn btn-green" onClick={addConnection}>Add</button>
            </div>
            {local.connections.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                <span>
                  {c.name} <span className="text-muted">({c.type})</span>
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10 }}
                  onClick={() =>
                    setLocal({ ...local, connections: local.connections.filter((x) => x.id !== c.id) })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-green" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
