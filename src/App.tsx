import { useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { AIAssistantWorkspace } from './components/AIAssistantWorkspace';
import { AIPanel } from './components/AIPanel';
import { BacktestingWorkspace } from './components/BacktestingWorkspace';
import { CanvasBoard } from './components/CanvasBoard';
import { CoinList } from './components/CoinList';
import { DoginalStudio } from './components/DoginalStudio';
import { SettingsWorkspace, type WorkspaceTab } from './components/SettingsWorkspace';
import { TopBar } from './components/TopBar';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { useDashboardState } from './hooks/useDashboardState';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const {
    settings,
    setSettings,
    coins,
    activeMint,
    setActiveMint,
    searchQuery,
    setSearchQuery,
    messages,
    setMessages,
    setAIContext,
    widgets,
    setWidgets,
    prices,
    status,
    setStatus,
    aiRuntimeConfig,
    activeCoin,
    addCoin,
    removeCoin,
  } = useDashboardState();

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="app-shell flex min-h-0 flex-col"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <TopBar status={status} activeSymbol={activeCoin?.symbol} />
        <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="workspace-stage">
          <div
            id="panel-home"
            className="workspace-grid"
            role="tabpanel"
            aria-labelledby="tab-home"
            tabIndex={0}
            hidden={activeTab !== 'home'}
          >
            <aside className="watchlist-column">
              <section className="panel watchlist-panel">
                <div className="panel-header">
                  <h2>Watchlist</h2>
                  <span className="count-pill">{coins.length}/{settings.maxWatchlist}</span>
                </div>
                <div className="watchlist-search">
                  <form
                    className="search-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addCoin(searchQuery);
                    }}
                  >
                    <input
                      className="input"
                      aria-label="Search for a token"
                      placeholder="Search name, symbol, or mint"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    <button type="submit" className="btn btn-primary add-token" aria-label="Add token">
                      Add
                    </button>
                  </form>
                </div>
                <CoinList
                  coins={coins}
                  prices={prices}
                  activeMint={activeMint}
                  onSelect={setActiveMint}
                  onRemove={removeCoin}
                />
              </section>
            </aside>

            <main className="market-column">
              <CanvasBoard
                widgets={widgets}
                setWidgets={setWidgets}
                activeCoin={activeCoin}
                price={activeMint ? prices[activeMint] : undefined}
              />
            </main>
          </div>

          <SettingsWorkspace
            settings={settings}
            onChange={setSettings}
            activeTab={activeTab}
            hidden={activeTab === 'home' || activeTab === 'backtesting' || activeTab === 'ai' || activeTab === 'doginal'}
          />
          <BacktestingWorkspace
            coins={coins}
            aiConfig={aiRuntimeConfig}
            hidden={activeTab !== 'backtesting'}
          />
          <AIAssistantWorkspace
            aiConfig={settings.ai}
            onAIConfigChange={(ai) => setSettings((current) => ({ ...current, ai }))}
            onContextChange={setAIContext}
            hidden={activeTab !== 'ai'}
          />
          <DoginalStudio hidden={activeTab !== 'doginal'} />

          <aside className="assistant-column">
            <AIPanel
              config={aiRuntimeConfig}
              messages={messages}
              setMessages={setMessages}
              activeCoin={activeCoin}
              onStatus={setStatus}
            />
          </aside>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
