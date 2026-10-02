import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import type { AppSettings, ConnectionConfig } from '../types';

export type WorkspaceTab = 'home' | 'backtesting' | 'settings' | 'ai' | 'keys' | 'connections' | 'doginal';
type SettingsTab = Exclude<WorkspaceTab, 'home' | 'backtesting' | 'ai' | 'doginal'>;

interface Props {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  activeTab: WorkspaceTab;
  hidden: boolean;
}

const TAB_CONTENT: Record<SettingsTab, { title: string; description: string }> = {
  settings: {
    title: 'Workspace Settings',
    description: 'Set your Solana network and watchlist preferences.',
  },
  keys: {
    title: 'Private Credentials',
    description: 'Manage the credentials used to connect your services.',
  },
  connections: {
    title: 'Connections',
    description: 'Keep the feeds and services for your research desk in one place.',
  },
};

export function SettingsWorkspace({ settings, onChange, activeTab, hidden }: Props) {
  const [local, setLocal] = useState(settings);
  const [newConn, setNewConn] = useState({ name: '', url: '', type: 'rest' as ConnectionConfig['type'] });
  const previousSettings = useRef(settings);
  useEffect(() => {
    const previous = previousSettings.current;
    setLocal((current) => ({
      jupiterApiKey: current.jupiterApiKey === previous.jupiterApiKey
        ? settings.jupiterApiKey
        : current.jupiterApiKey,
      rpcUrl: current.rpcUrl === previous.rpcUrl ? settings.rpcUrl : current.rpcUrl,
      ai: {
        ...settings.ai,
        apiKey: current.ai.apiKey === previous.ai.apiKey
          ? settings.ai.apiKey
          : current.ai.apiKey,
      },
      connections: current.connections === previous.connections
        ? settings.connections
        : current.connections,
      maxWatchlist: current.maxWatchlist === previous.maxWatchlist
        ? settings.maxWatchlist
        : current.maxWatchlist,
      theme: current.theme === previous.theme ? settings.theme : current.theme,
    }));
    previousSettings.current = settings;
  }, [settings]);
  const selectedTab: SettingsTab =
    activeTab === 'keys' || activeTab === 'connections'
      ? activeTab
      : 'settings';
  const content = TAB_CONTENT[selectedTab];
  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings);

  const save = () => onChange(local);

  const discard = () => {
    setLocal(settings);
    setNewConn({ name: '', url: '', type: 'rest' });
  };

  const addConnection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const connection: ConnectionConfig = {
      id: crypto.randomUUID(),
      name: newConn.name.trim(),
      type: newConn.type,
      url: newConn.url.trim(),
      enabled: true,
    };
    setLocal((current) => ({ ...current, connections: [...current.connections, connection] }));
    setNewConn({ name: '', url: '', type: 'rest' });
  };

  return (
    <motion.section
      id={`panel-${selectedTab}`}
      className="settings-workspace"
      role="tabpanel"
      aria-labelledby={`tab-${selectedTab}`}
      tabIndex={0}
      hidden={hidden}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <header className="settings-page-header">
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </header>

      <div className="settings-page-content">
        {selectedTab === 'settings' && (
          <section className="panel settings-page-card">
            <div className="settings-section-heading">
              <span className="settings-icon settings-icon-purple" aria-hidden="true">S</span>
              <div>
                <h2>Network &amp; watchlist</h2>
                <p>Connect to Solana and choose your watchlist size.</p>
              </div>
            </div>
            <div className="settings-page-fields">
              <div className="form-field">
                <label htmlFor="solana-rpc">Solana RPC URL</label>
                <input
                  id="solana-rpc"
                  className="input"
                  type="url"
                  value={local.rpcUrl}
                  onChange={(event) => setLocal((current) => ({ ...current, rpcUrl: event.target.value }))}
                />
                <span className="field-hint">The endpoint used for Solana network requests.</span>
              </div>
              <div className="form-field">
                <label htmlFor="watchlist-limit">Maximum watchlist tokens</label>
                <input
                  id="watchlist-limit"
                  className="input"
                  type="number"
                  min={1}
                  max={2000}
                  value={local.maxWatchlist}
                  onChange={(event) => setLocal((current) => ({
                    ...current,
                    maxWatchlist: Math.min(2000, Math.max(1, Math.floor(Number(event.target.value) || 1))),
                  }))}
                />
                <span className="field-hint">Choose a limit from 1 to 2,000 tokens.</span>
              </div>
            </div>
          </section>
        )}

        {selectedTab === 'keys' && (
          <section className="panel settings-page-card">
            <div className="settings-section-heading">
              <span className="settings-icon settings-icon-orange" aria-hidden="true">K</span>
              <div>
                <h2>API Keys</h2>
                <p>Keys are saved in this browser's local settings.</p>
              </div>
            </div>
            <div className="settings-page-fields">
              <div className="form-field">
                <label htmlFor="jupiter-api-key">Jupiter API key <span>Optional</span></label>
                <input
                  id="jupiter-api-key"
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder="Paste your Jupiter API key"
                  value={local.jupiterApiKey || ''}
                  onChange={(event) => setLocal((current) => ({ ...current, jupiterApiKey: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="ai-api-key">AI provider API key <span>Optional</span></label>
                <input
                  id="ai-api-key"
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder="Paste your model provider key"
                  value={local.ai.apiKey || ''}
                  onChange={(event) => setLocal((current) => ({
                    ...current,
                    ai: { ...current.ai, apiKey: event.target.value },
                  }))}
                />
                <span className="field-hint">Only enter keys you trust this device to store.</span>
              </div>
            </div>
          </section>
        )}

        {selectedTab === 'connections' && (
          <>
            <section className="panel settings-page-card">
              <div className="settings-section-heading">
                <span className="settings-icon settings-icon-orange" aria-hidden="true">+</span>
                <div>
                  <h2>Research sources</h2>
                  <p>Add feeds or services to your research desk.</p>
                </div>
              </div>
              <form className="connection-form" onSubmit={addConnection}>
                <div className="form-field">
                  <label htmlFor="connection-name">Connection name</label>
                  <input
                    id="connection-name"
                    className="input"
                    placeholder="e.g. Market headlines"
                    value={newConn.name}
                    onChange={(event) => setNewConn((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="connection-url">Feed or service URL</label>
                  <input
                    id="connection-url"
                    className="input"
                    type="url"
                    placeholder="https://…"
                    value={newConn.url}
                    onChange={(event) => setNewConn((current) => ({ ...current, url: event.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="connection-type">Type</label>
                  <select
                    id="connection-type"
                    className="input"
                    value={newConn.type}
                    onChange={(event) => {
                      const type = event.target.value;
                      if (type === 'rest' || type === 'websocket' || type === 'rss' || type === 'custom') {
                        setNewConn((current) => ({ ...current, type }));
                      }
                    }}
                  >
                    <option value="rest">REST</option>
                    <option value="websocket">WebSocket</option>
                    <option value="rss">RSS</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary">Add connection</button>
              </form>
            </section>

            <section className="panel settings-page-card">
              <div className="settings-section-heading">
                <span className="settings-icon settings-icon-green" aria-hidden="true">
                  {local.connections.length}
                </span>
                <div>
                  <h2>Saved connections</h2>
                  <p>{local.connections.length ? 'Your configured research sources.' : 'Your saved sources will appear here.'}</p>
                </div>
              </div>
              {local.connections.length > 0 ? (
                <ul className="connection-list">
                  {local.connections.map((connection) => (
                    <li key={connection.id}>
                      <span className="connection-details">
                        <strong>{connection.name}</strong>
                        <span className="connection-type">{connection.type}</span>
                        <span className="connection-url" title={connection.url}>{connection.url}</span>
                      </span>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setLocal((current) => ({
                          ...current,
                          connections: current.connections.filter((item) => item.id !== connection.id),
                        }))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="connections-empty">No sources connected yet. Add one above to get started.</p>
              )}
            </section>
          </>
        )}
      </div>

      <footer className="settings-page-actions">
        <span className="settings-save-hint" role="status">
          {hasChanges ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <button type="button" className="btn btn-quiet" onClick={discard} disabled={!hasChanges}>
          Discard changes
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!hasChanges}>
          Save changes
        </button>
      </footer>
    </motion.section>
  );
}
